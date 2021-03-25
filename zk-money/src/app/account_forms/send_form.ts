import { AccountId, EthAddress, JoinSplitProofOutput, SettlementTime, TxType, WalletSdk } from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { debounce, DebouncedFunc } from 'lodash';
import { AccountState, AssetState } from '../account_state';
import { AccountUtils } from '../account_utils';
import { formatAliasInput, isSameAlias, isValidAliasInput } from '../alias';
import { Asset } from '../assets';
import {
  BigIntValue,
  BoolInput,
  clearMessage,
  clearMessages,
  formatBigIntInput,
  FormStatus,
  FormValue,
  IntValue,
  isValidForm,
  mergeValues,
  StrInput,
  ValueAvailability,
  withError,
  withMessage,
} from '../form';
import { RollupService, RollupServiceEvent, TxFee } from '../rollup_service';
import { fromBaseUnits, max, min, toBaseUnits } from '../units';
import { AccountForm, AccountFormEvent } from './account_form';

const debug = createDebug('zm:send_form');

export const isAddress = (recipient: string) => EthAddress.isAddress(recipient.trim());

export enum SendStatus {
  NADA,
  CONFIRM,
  VALIDATE,
  CREATE_PROOF,
  SEND_PROOF,
  DONE,
}

interface TxFeesValue extends FormValue {
  value: TxFee[];
}

interface TxSpeedInput extends IntValue {
  value: SettlementTime;
}

interface RecipientInput extends FormValue {
  value: {
    input: string;
    txType: TxType;
    valid: ValueAvailability;
  };
}

export interface SendFormValues {
  amount: StrInput;
  maxAmount: BigIntValue;
  fees: TxFeesValue;
  speed: TxSpeedInput;
  recipient: RecipientInput;
  confirmed: BoolInput;
  status: {
    value: SendStatus;
  };
  submit: BoolInput;
}

const initialSendFormValues = {
  amount: {
    value: '',
    required: true,
  },
  maxAmount: {
    value: 0n,
  },
  fees: {
    value: [],
  },
  speed: {
    value: SettlementTime.SLOW,
  },
  recipient: {
    value: {
      input: '',
      txType: TxType.TRANSFER,
      valid: ValueAvailability.INVALID,
    },
  },
  confirmed: {
    value: false,
    required: true,
  },
  status: {
    value: SendStatus.NADA,
  },
  submit: {
    value: false,
  },
};

export class SendForm extends EventEmitter implements AccountForm {
  private readonly userId: AccountId;
  private readonly alias: string;
  private readonly asset: Asset;

  private values: SendFormValues = initialSendFormValues;
  private formStatus = FormStatus.ACTIVE;
  private proofOutput?: JoinSplitProofOutput;

  private debounceUpdateRecipientStatus: DebouncedFunc<() => void>;
  private debounceUpdateRecipientTxType: DebouncedFunc<() => void>;

  private readonly aliasDebounceWait = 1000;
  private readonly txTypeDebounceWait = 1000;

  constructor(
    accountState: AccountState,
    private assetState: AssetState,
    private sdk: WalletSdk,
    private rollup: RollupService,
    private accountUtils: AccountUtils,
    private readonly txAmountLimit: bigint,
  ) {
    super();
    this.userId = accountState.userId;
    this.alias = accountState.alias;
    this.asset = assetState.asset;
    this.debounceUpdateRecipientStatus = debounce(this.updateRecipientStatus, this.aliasDebounceWait);
    this.debounceUpdateRecipientTxType = debounce(this.updateRecipientTxType, this.txTypeDebounceWait);
    this.values.fees = { value: this.rollup.getTxFees(this.asset.id, TxType.TRANSFER) };
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
    this.debounceUpdateRecipientStatus.cancel();
    this.debounceUpdateRecipientTxType.cancel();
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

  changeValues(newValues: Partial<SendFormValues>) {
    if (this.locked) {
      debug('Cannot change form values while it is locked.');
      return;
    }

    const changes = { ...newValues };
    if (changes.amount) {
      changes.amount = formatBigIntInput(changes.amount);
    }
    if (changes.recipient) {
      this.debounceUpdateRecipientStatus.cancel();
      this.debounceUpdateRecipientTxType.cancel();

      const recipient = changes.recipient.value.input;
      let valid = ValueAvailability.PENDING;
      let txType = this.values.recipient.value.txType;
      if (isAddress(recipient)) {
        valid = ValueAvailability.VALID;
      } else if (isSameAlias(recipient, this.alias) || !isValidAliasInput(recipient)) {
        valid = ValueAvailability.INVALID;
      } else {
        txType = TxType.TRANSFER;
      }
      changes.recipient = { value: { input: recipient, txType, valid } };
    }

    this.refreshValues(changes);

    if (changes.recipient) {
      const { input, valid } = changes.recipient.value;
      if (valid === ValueAvailability.PENDING) {
        this.debounceUpdateRecipientStatus();
      }
      if (isAddress(input)) {
        this.debounceUpdateRecipientTxType();
      }
    }
  }

  unlock() {
    if (this.processing) {
      debug('Cannot unlock a form while it is being processed.');
      return;
    }

    this.refreshValues({
      status: { value: SendStatus.NADA },
      submit: clearMessage({ value: false }),
    });
    this.updateFormStatus(FormStatus.ACTIVE);
  }

  async lock() {
    this.updateFormValues({ submit: { value: true } });

    this.updateFormStatus(FormStatus.LOCKED);

    const validated = await this.validateValues();
    if (isValidForm(validated)) {
      this.updateFormValues({ status: { value: SendStatus.CONFIRM } });
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

    const status = Math.max(this.values.status.value, SendStatus.VALIDATE);
    this.updateFormValues({ status: { value: status }, submit: clearMessage({ value: true }) });

    const validated = await this.validateValues();
    if (!isValidForm(validated)) {
      this.updateFormValues(mergeValues(validated, { status: { value: SendStatus.CONFIRM } }));
      return;
    }

    this.updateFormStatus(FormStatus.PROCESSING);

    try {
      const recipient = this.values.recipient.value.input;
      if (isAddress(recipient)) {
        await this.publicSend(EthAddress.fromString(recipient.trim()));
      } else {
        await this.privateSend(formatAliasInput(recipient));
      }
      this.updateFormValues({ submit: { value: false } });
    } catch (e) {
      debug(e);
      this.updateFormValues({
        submit: withError({ value: false }, `Something went wrong. This shouldn't happen.`),
      });
    }

    this.updateFormStatus(FormStatus.LOCKED);
  }

  private refreshValues(changes: Partial<SendFormValues> = {}) {
    const { txType } = (changes.recipient || this.values.recipient).value;
    const fees = this.rollup.getTxFees(this.asset.id, txType);
    const speed = (changes.speed || this.values.speed).value;
    const fee = fees[speed].fee;
    const { spendableBalance } = this.assetState;
    const maxAmount = min(max(0n, spendableBalance - fee), this.txAmountLimit);

    const toUpdate = this.validateChanges({
      maxAmount: { value: maxAmount },
      fees: { value: fees },
      ...changes,
    });

    this.updateFormValues(toUpdate);
  }

  private validateChanges(changes: Partial<SendFormValues>) {
    const toUpdate = clearMessages(changes);

    if (changes.amount) {
      const amountInput = changes.amount;
      const amountValue = toBaseUnits(amountInput.value, this.asset.decimals);
      if (amountValue > this.txAmountLimit) {
        toUpdate.amount = withError(
          amountInput,
          `For security, amount is capped at ${fromBaseUnits(this.txAmountLimit, this.asset.decimals)} ${
            this.asset.symbol
          }.`,
        );
      }
    }

    if (!toUpdate.amount?.message) {
      const amountInput = changes.amount || this.values.amount;
      const amountValue = toBaseUnits(amountInput.value, this.asset.decimals);
      if (amountValue > (changes.maxAmount || this.values.maxAmount).value) {
        toUpdate.amount = withError(amountInput, `Insufficient zk${this.asset.symbol} Balance.`);
      } else {
        toUpdate.amount = clearMessage(amountInput);
      }
    }

    return toUpdate;
  }

  private async validateValues() {
    const form = { ...this.values };

    const recipient = form.recipient.value.input;
    if (!recipient) {
      form.recipient = withError(form.recipient, `Please enter recipient's username or ethereum address.`);
    } else if (isSameAlias(recipient, this.alias)) {
      form.recipient = withError(form.recipient, 'Cannot send fund to yourself.');
    } else if (!isAddress(recipient) && !(await this.accountUtils.getAccountId(recipient))) {
      form.recipient = withError(form.recipient, `Cannot find a user with username '${recipient}'.`);
    }

    const fee = form.fees.value[form.speed.value].fee;
    const txType = await this.getRecipientTxType(recipient);
    if (this.status === SendStatus.VALIDATE) {
      // This error won't be displayed in the form but should trigger a "Session Expired" error in the confirm step.
      const currentFee = this.rollup.getFee(this.asset.id, txType, form.speed.value);
      if (fee !== currentFee) {
        form.fees = withError(
          form.fees,
          `Fee has changed from ${fromBaseUnits(fee, this.asset.decimals)} to ${fromBaseUnits(
            currentFee,
            this.asset.decimals,
          )}.`,
        );
      }
    }

    const amount = toBaseUnits(form.amount.value, this.asset.decimals);
    if (!amount) {
      form.amount = withError(form.amount, 'Amount must be greater than 0.');
    } else {
      const balance = this.sdk.getBalance(this.asset.id, this.userId);
      const maxAmount = min(max(0n, balance - fee), this.txAmountLimit);
      if (amount > maxAmount) {
        form.amount = withError(form.amount, `Insufficient zk${this.asset.symbol} Balance.`);
      }
    }

    if (!form.confirmed.value) {
      form.confirmed = withError(form.confirmed, 'Please confirm that you understand the risk.');
    }

    return form;
  }

  private async privateSend(alias: string) {
    if (this.status <= SendStatus.CREATE_PROOF) {
      this.proceed(SendStatus.CREATE_PROOF);

      const userData = this.sdk.getUserData(this.userId);
      const signer = this.sdk.createSchnorrSigner(userData.privateKey);
      const noteRecipient = await this.accountUtils.getAccountId(alias);
      const amount = toBaseUnits(this.values.amount.value, this.asset.decimals);
      const fee = this.values.fees.value[this.values.speed.value].fee;
      this.proofOutput = await this.sdk.createJoinSplitProof(
        this.asset.id,
        this.userId,
        0n,
        0n,
        amount + fee,
        amount,
        0n,
        signer,
        noteRecipient,
      );
    }

    this.proceed(SendStatus.SEND_PROOF);

    try {
      await this.sdk.sendProof(this.proofOutput!);
    } catch (e) {
      debug(e);
      return this.abort('Failed to send the proof.');
    }

    this.proceed(SendStatus.DONE);
  }

  private async publicSend(ethAddress: EthAddress) {
    if (this.status <= SendStatus.CREATE_PROOF) {
      this.proceed(SendStatus.CREATE_PROOF);

      const userData = this.sdk.getUserData(this.userId);
      const signer = this.sdk.createSchnorrSigner(userData.privateKey);
      const amount = toBaseUnits(this.values.amount.value, this.asset.decimals);
      const fee = this.values.fees.value[this.values.speed.value].fee;
      this.proofOutput = await this.sdk.createJoinSplitProof(
        this.asset.id,
        this.userId,
        0n,
        amount,
        amount + fee,
        0n,
        0n,
        signer,
        undefined,
        undefined,
        ethAddress,
      );
    }

    this.proceed(SendStatus.SEND_PROOF);

    try {
      await this.sdk.sendProof(this.proofOutput!);
    } catch (e) {
      debug(e);
      return this.abort('Failed to send the proof.');
    }

    this.proceed(SendStatus.DONE);
  }

  private async getRecipientTxType(recipient: string) {
    if (!isAddress(recipient)) {
      return TxType.TRANSFER;
    }

    const isContract = await this.sdk.isContract(EthAddress.fromString(recipient));
    return isContract ? TxType.WITHDRAW_TO_CONTRACT : TxType.WITHDRAW_TO_WALLET;
  }

  private onRollupStatusChange = () => {
    if (!this.locked) {
      this.refreshValues();
    }
  };

  private updateRecipientStatus = async () => {
    const recipient = this.values.recipient.value.input;
    if (isAddress(recipient)) return;

    const valid = (await this.accountUtils.getAccountId(recipient))
      ? ValueAvailability.VALID
      : ValueAvailability.INVALID;
    this.updateFormValues({ recipient: { value: { ...this.values.recipient.value, valid } } });
  };

  private updateRecipientTxType = async () => {
    const recipient = this.values.recipient.value.input;
    const txType = await this.getRecipientTxType(recipient);
    if (recipient === this.values.recipient.value.input) {
      this.refreshValues({ recipient: { value: { ...this.values.recipient.value, txType } } });
    }
  };

  private updateFormStatus(status: FormStatus) {
    this.formStatus = status;
    this.emit(AccountFormEvent.UPDATED_FORM_STATUS, status);
  }

  private updateFormValues(changes: Partial<SendFormValues>) {
    this.values = mergeValues(this.values, changes);
    this.emit(AccountFormEvent.UPDATED_FORM_VALUES, this.values);
  }

  private proceed(status: SendStatus, message = '') {
    this.updateFormValues({
      status: { value: status },
      submit: withMessage({ value: true }, message),
    });
  }

  private abort(message: string) {
    this.updateFormValues({
      submit: withError({ value: false }, message),
    });
  }
}
