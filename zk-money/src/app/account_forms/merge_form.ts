import { AccountId, JoinSplitProofOutput, Note, TxType, WalletSdk } from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { AccountState, AssetState } from '../account_state';
import { Asset } from '../assets';
import {
  BoolInput,
  clearMessage,
  FormStatus,
  isValidForm,
  mergeValues,
  StrInput,
  withError,
  withMessage,
} from '../form';
import { RollupService, RollupServiceEvent } from '../rollup_service';
import { fromBaseUnits, sum, toBaseUnits } from '../units';
import { AccountForm, AccountFormEvent } from './account_form';

const debug = createDebug('zm:merge_form');

const sumNotes = (notes: Note[]) => notes.reduce((sum, note) => sum + note.value, 0n);

export const getMergeOptions = ({ spendableNotes, spendableBalance }: AssetState, fee: bigint) => {
  return [spendableNotes.slice(-3)]
    .filter(notes => sumNotes(notes) - fee > spendableBalance)
    .map(notes => notes.reduce((values, note) => [...values, note.value], [] as bigint[]));
};

export enum MergeStatus {
  NADA,
  CONFIRM,
  VALIDATE,
  CREATE_PROOF,
  SEND_PROOF,
  DONE,
}

export interface MergeFormValues {
  mergeOptions: {
    value: bigint[][];
  };
  toMerge: {
    value: bigint[];
  };
  fee: StrInput;
  status: {
    value: MergeStatus;
  };
  submit: BoolInput;
}

const initialMergeFormValues = {
  mergeOptions: {
    value: [],
  },
  toMerge: {
    value: [],
  },
  fee: {
    value: '',
  },
  status: {
    value: MergeStatus.NADA,
  },
  submit: {
    value: false,
  },
};

export class MergeForm extends EventEmitter implements AccountForm {
  private readonly userId: AccountId;
  private readonly asset: Asset;

  private values: MergeFormValues = initialMergeFormValues;
  private formStatus = FormStatus.ACTIVE;
  private proofOutput?: JoinSplitProofOutput;

  private minFee = 0n;

  constructor(
    accountState: AccountState,
    private assetState: AssetState,
    private sdk: WalletSdk,
    private rollup: RollupService,
  ) {
    super();
    this.userId = accountState.userId;
    this.asset = assetState.asset;
    this.refreshValues();
  }

  get locked() {
    return this.formStatus === FormStatus.LOCKED || this.formStatus === FormStatus.PROCESSING;
  }

  get processing() {
    return this.formStatus === FormStatus.PROCESSING;
  }

  private get status() {
    return this.values.status.value;
  }

  getValues() {
    return { ...this.values };
  }

  destroy() {
    if (this.processing) {
      throw new Error('Cannot destroy a form while it is being processed.');
    }

    this.removeAllListeners();
    this.rollup.off(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
  }

  async init() {
    this.rollup.on(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    this.refreshValues();
  }

  changeAccountState() {}

  changeAssetState(assetState: AssetState) {
    if (this.processing) {
      debug('Cannot change asset state while a form is being processed.');
      return;
    }

    if (assetState.asset.id !== this.asset.id) {
      throw new Error('Cannot change asset of a form.');
    }

    this.assetState = assetState;
    this.refreshValues();
  }

  changeProvider() {}

  changeEthAccount() {}

  changeValues(changes: Partial<MergeFormValues>) {
    if (this.locked) {
      debug('Cannot change form values while it is locked.');
      return;
    }

    this.updateFormValues(changes);
  }

  unlock() {
    if (this.processing) {
      debug('Cannot unlock a form while it is being processed.');
      return;
    }

    this.refreshValues({
      status: { value: MergeStatus.NADA },
      submit: clearMessage({ value: false }),
    });
    this.updateFormStatus(FormStatus.ACTIVE);
  }

  async lock() {
    this.updateFormValues({ submit: { value: true } });

    this.updateFormStatus(FormStatus.LOCKED);

    const validated = await this.validateValues();
    if (isValidForm(validated)) {
      this.updateFormValues({ status: { value: MergeStatus.CONFIRM } });
    } else {
      this.updateFormValues(mergeValues(validated, { submit: { value: false } }));
      this.updateFormStatus(FormStatus.ACTIVE);
    }
  }

  async submit() {
    if (!this.locked) {
      debug('Cannot submit a form before it has been validated and locked.');
      return;
    }

    const status = Math.max(this.values.status.value, MergeStatus.VALIDATE);
    this.updateFormValues({ status: { value: status }, submit: clearMessage({ value: true }) });

    const validated = await this.validateValues();
    if (!isValidForm(validated)) {
      this.updateFormValues(mergeValues(validated, { status: { value: MergeStatus.CONFIRM } }));
      return;
    }

    this.updateFormStatus(FormStatus.PROCESSING);

    try {
      await this.merge();
      this.updateFormValues({ submit: { value: false } });
    } catch (e) {
      debug(e);
      this.updateFormValues({
        submit: withError({ value: false }, `Something went wrong. This shouldn't happen.`),
      });
    }

    this.updateFormStatus(FormStatus.LOCKED);
  }

  private refreshValues(changes: Partial<MergeFormValues> = {}) {
    this.minFee = this.rollup.getMinFee(this.asset.id, TxType.TRANSFER);

    const fee = this.minFee;
    const mergeOptions = getMergeOptions(this.assetState, fee);

    this.updateFormValues({
      mergeOptions: { value: mergeOptions },
      fee: { value: fromBaseUnits(fee, this.asset.decimals) },
      ...changes,
    });
  }

  private async validateValues() {
    const form = { ...this.values };

    const fee = toBaseUnits(form.fee.value, this.asset.decimals);
    const minFee = await this.sdk.getFee(this.asset.id, TxType.TRANSFER);
    if (fee < minFee) {
      form.fee = withError(form.fee, `Fee cannot be less than ${fromBaseUnits(minFee, this.asset.decimals)}.`);
    }

    const mergeOptions = getMergeOptions(this.assetState, fee);
    const toMerge = sum(form.toMerge.value);
    if (!mergeOptions.some(options => sum(options) === toMerge)) {
      form.toMerge = withError(form.toMerge, 'Invalid merge. Balance has changed.');
    }

    return form;
  }

  private async merge() {
    const proceed = (status: MergeStatus, message = '') => {
      this.updateFormValues({
        status: { value: status },
        submit: withMessage({ value: true }, message),
      });
    };

    if (this.status <= MergeStatus.CREATE_PROOF) {
      proceed(MergeStatus.CREATE_PROOF);

      const userData = this.sdk.getUserData(this.userId);
      const signer = this.sdk.createSchnorrSigner(userData.privateKey);
      const toMerge = sum(this.values.toMerge.value.slice(0, 2));
      const fee = toBaseUnits(this.values.fee.value, this.asset.decimals);
      this.proofOutput = await this.sdk.createJoinSplitProof(
        this.asset.id,
        this.userId,
        0n,
        0n,
        toMerge,
        0n,
        toMerge - fee,
        signer,
      );
    }

    proceed(MergeStatus.SEND_PROOF);

    try {
      await this.sdk.sendProof(this.proofOutput!);
    } catch (e) {
      debug(e);
      this.updateFormValues({
        submit: withError({ value: false }, 'Failed to send the proof.'),
      });
    }

    proceed(MergeStatus.DONE);
  }

  private onRollupStatusChange = () => {
    if (!this.locked) {
      this.refreshValues();
    }
  };

  private updateFormStatus(status: FormStatus) {
    this.formStatus = status;
    this.emit(AccountFormEvent.UPDATED_FORM_STATUS, status);
  }

  private updateFormValues(changes: Partial<MergeFormValues>) {
    this.values = mergeValues(this.values, changes);
    this.emit(AccountFormEvent.UPDATED_FORM_VALUES, this.values);
  }
}
