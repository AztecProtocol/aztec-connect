import type { CutdownAsset } from 'app/types';
import { AccountId, AztecSdk, Note } from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { AccountState, AssetState } from '../account_state';
import {
  BoolInput,
  clearMessage,
  FormStatus,
  isValidForm,
  mergeValues,
  StrInput,
  withError,
  withWarning,
} from '../form';
import { createSigningKeys, KeyVault } from '../key_vault';
import { Provider, ProviderEvent } from '../provider';
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
  GENERATE_KEY,
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

// TODO - delete it
export class MergeForm extends EventEmitter implements AccountForm {
  private readonly userId: AccountId;
  private readonly asset: CutdownAsset;

  private values: MergeFormValues = initialMergeFormValues;
  private formStatus = FormStatus.ACTIVE;
  private destroyed = false;

  private minFee = 0n;

  constructor(
    accountState: AccountState,
    private assetState: AssetState,
    private provider: Provider | undefined,
    private readonly keyVault: KeyVault,
    private readonly sdk: AztecSdk,
    private readonly rollup: RollupService,
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

    this.destroyed = true;
    this.removeAllListeners();
    this.rollup.off(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    this.provider?.off(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
  }

  async init() {
    this.rollup.on(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    this.provider?.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.refreshValues();
  }

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

  changeProvider(provider?: Provider) {
    if (this.processing) {
      debug('Cannot change provider while a form is being processed.');
      return;
    }

    this.provider?.off(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.provider = provider;
    this.provider?.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.onProviderStateChange();
  }

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

    this.updateFormValues({ status: { value: MergeStatus.VALIDATE }, submit: clearMessage({ value: true }) });

    const validated = await this.validateValues();
    if (!isValidForm(validated)) {
      this.updateFormValues(mergeValues(validated, { status: { value: MergeStatus.CONFIRM } }));
      return;
    }

    this.updateFormValues({ status: { value: MergeStatus.GENERATE_KEY } });
    await this.requestSigningKey();
  }

  private refreshValues(changes: Partial<MergeFormValues> = {}) {
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
    const [{ value: minFee }] = await this.sdk.getTransferFees(this.asset.id);
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

  private async createProof(privateKey: Buffer) {
    this.updateFormValues({ status: { value: MergeStatus.VALIDATE }, submit: clearMessage({ value: true }) });

    const validated = await this.validateValues();
    if (!isValidForm(validated)) {
      this.updateFormValues(mergeValues(validated, { status: { value: MergeStatus.CONFIRM } }));
      return;
    }

    this.updateFormStatus(FormStatus.PROCESSING);

    try {
      await this.merge(privateKey);
      this.updateFormValues({ submit: { value: false } });
    } catch (e) {
      debug(e);
      this.updateFormValues({
        submit: withError({ value: false }, `Something went wrong. This shouldn't happen.`),
      });
    }

    this.updateFormStatus(FormStatus.LOCKED);
  }

  private async merge(privateKey: Buffer) {
    throw new Error('Deprecated.');
  }

  private onRollupStatusChange = () => {
    if (!this.locked) {
      this.refreshValues();
    }
  };

  private onProviderStateChange = async () => {
    if (this.status === MergeStatus.GENERATE_KEY) {
      await this.requestSigningKey();
    }
  };

  private async requestSigningKey() {
    if (!this.provider) {
      this.updateFormValues({
        submit: clearMessage({ value: true }),
      });
      return;
    }

    const provider = this.provider;
    const { account } = provider;
    const { signerAddress } = this.keyVault;
    if (!account?.equals(signerAddress)) {
      this.prompt(
        `Please switch your wallet's account to ${signerAddress.toString().slice(0, 6)}...${signerAddress
          .toString()
          .slice(-4)}.`,
      );
      return;
    }

    this.prompt('Please sign the message in your wallet to generate your Aztec Spending Key.');

    try {
      const { privateKey } = await createSigningKeys(provider, this.sdk);
      if (!this.destroyed && this.status === MergeStatus.GENERATE_KEY && provider === this.provider) {
        await this.createProof(privateKey);
      }
    } catch (e) {
      if (this.status === MergeStatus.GENERATE_KEY && provider === this.provider) {
        this.updateFormValues({ status: { value: MergeStatus.CONFIRM }, submit: clearMessage({ value: true }) });
      }
    }
  }

  private updateFormStatus(status: FormStatus) {
    this.formStatus = status;
    this.emit(AccountFormEvent.UPDATED_FORM_STATUS, status);
  }

  private updateFormValues(changes: Partial<MergeFormValues>) {
    this.values = mergeValues(this.values, changes);
    this.emit(AccountFormEvent.UPDATED_FORM_VALUES, this.values);
  }

  private prompt(message: string) {
    this.updateFormValues({
      submit: withWarning({ value: true }, message),
    });
  }
}
