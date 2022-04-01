import type { CutdownAsset } from 'app/types';
import {
  AccountId,
  AztecSdk,
  EthAddress,
  TransferController,
  TxSettlementTime,
  TxType,
  WithdrawController,
} from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { debounce, DebouncedFunc } from 'lodash';
import { AccountUtils } from '../account_utils';
import { formatAliasInput, isSameAlias, isValidAliasInput } from '../alias';
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
  withWarning,
} from '../form';
import { createSigningKeys, KeyVault } from '../key_vault';
import { Provider, ProviderEvent } from '../provider';
import { RollupService, RollupServiceEvent, TxFee } from '../rollup_service';
import { fromBaseUnits, max, min, toBaseUnits } from '../units';
import { AccountForm, AccountFormEvent } from './account_form';
import { TransactionGraph } from './transaction_graph';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';

const debug = createDebug('zm:send_form');

export const isAddress = (recipient: string) => EthAddress.isAddress(recipient.trim());

export enum SendStatus {
  NADA,
  CONFIRM,
  VALIDATE,
  GENERATE_KEY,
  CREATE_PROOF,
  SEND_PROOF,
  DONE,
}

export interface TxFeesValue extends FormValue {
  value: TxFee[];
}

interface TxSpeedInput extends IntValue {
  value: TxSettlementTime;
}

export type PrivacyIssue = 'already-withdrawn-to' | 'already-deposited-from' | 'none';
interface PrivacyIssueValue extends FormValue {
  value: PrivacyIssue;
}

export interface RecipientInput extends FormValue {
  value: {
    input: string;
    txType: TxType;
    valid: ValueAvailability;
  };
}

export enum SendMode {
  SEND,
  WIDTHDRAW,
}

export interface SendFormValues {
  privacyIssue: PrivacyIssueValue;
  selectedAmount: BigIntValue;
  amount: StrInput;
  maxAmount: BigIntValue;
  fees: TxFeesValue;
  speed: TxSpeedInput;
  recipient: RecipientInput;
  status: {
    value: SendStatus;
  };
  submit: BoolInput;
}

const initialSendFormValues = {
  privacyIssue: { value: 'none' as PrivacyIssue },
  selectedAmount: {
    value: 0n,
  },
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
    value: TxSettlementTime.NEXT_ROLLUP,
  },
  recipient: {
    value: {
      input: '',
      txType: TxType.TRANSFER,
      valid: ValueAvailability.INVALID,
    },
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
  private readonly asset: CutdownAsset;
  private readonly sendMode: SendMode;

  private values: SendFormValues = initialSendFormValues;
  private formStatus = FormStatus.ACTIVE;
  private proofController?: TransferController | WithdrawController;
  private destroyed = false;

  private transactionGraph!: TransactionGraph;

  private debounceUpdateRecipientStatus: DebouncedFunc<() => void>;
  private debounceUpdateRecipientTxType: DebouncedFunc<() => void>;

  private readonly aliasDebounceWait = 1000;
  private readonly txTypeDebounceWait = 1000;

  constructor(
    accountState: { userId: AccountId; alias: string },
    private assetState: { asset: CutdownAsset; spendableBalance: bigint },
    private provider: Provider | undefined,
    private readonly keyVault: KeyVault,
    private readonly sdk: AztecSdk,
    private readonly rollup: RollupService,
    private readonly accountUtils: AccountUtils,
    private readonly txAmountLimit: bigint,
    private readonly sMode: SendMode,
  ) {
    super();
    this.userId = accountState.userId;
    this.alias = accountState.alias;
    this.asset = assetState.asset;
    this.sendMode = sMode;
    this.debounceUpdateRecipientStatus = debounce(this.updateRecipientStatus, this.aliasDebounceWait);
    this.debounceUpdateRecipientTxType = debounce(this.updateRecipientTxType, this.txTypeDebounceWait);
    this.refreshValues({
      fees: { value: this.rollup.getTxFees(this.asset.id, TxType.TRANSFER) },
    });
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
    this.debounceUpdateRecipientStatus.cancel();
    this.debounceUpdateRecipientTxType.cancel();
  }

  async init() {
    this.rollup.on(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    this.provider?.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.refreshValues();
    await this.initTransactionGraph();
  }

  changeAssetState(assetState: { asset: CutdownAsset; spendableBalance: bigint }) {
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

  async getFormValidity(recipient: string) {
    // to L1 address
    if (this.sendMode === SendMode.WIDTHDRAW && !isAddress(recipient)) {
      return ValueAvailability.INVALID;
    }

    // to L2 alias
    if (this.sendMode === SendMode.SEND) {
      if (
        isAddress(recipient) ||
        isSameAlias(recipient, this.alias) ||
        !isValidAliasInput(recipient) ||
        !(await this.accountUtils.isValidRecipient(recipient))
      ) {
        return ValueAvailability.INVALID;
      }
    }

    return ValueAvailability.VALID;
  }

  async changeValues(newValues: Partial<SendFormValues>) {
    if (this.locked) {
      debug('Cannot change form values while it is locked.');
      return;
    }

    const changes = { ...newValues };
    if (changes.amount) {
      changes.amount = formatBigIntInput(changes.amount);
      changes.selectedAmount = { value: 0n };
    }
    if (changes.recipient) {
      this.debounceUpdateRecipientStatus.cancel();
      this.debounceUpdateRecipientTxType.cancel();

      const recipient = changes.recipient.value.input;
      let valid = ValueAvailability.PENDING;
      let txType = this.values.recipient.value.txType;

      valid = await this.getFormValidity(recipient);

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

  async softValidation() {
    this.updateFormStatus(FormStatus.LOCKED);

    const validated = await this.validateValues();

    if (!isValidForm(validated)) {
      this.updateFormValues(mergeValues(validated, { submit: { value: false } }));
    }

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

    this.updateFormValues({ status: { value: SendStatus.VALIDATE }, submit: clearMessage({ value: true }) });

    const validated = await this.validateValues();
    if (!isValidForm(validated)) {
      this.updateFormValues(mergeValues(validated, { status: { value: SendStatus.CONFIRM } }));
      return;
    }

    this.updateFormValues({ status: { value: SendStatus.GENERATE_KEY } });
    await this.requestSigningKey();
  }

  private refreshValues(changes: Partial<SendFormValues> = {}) {
    const { txType } = (changes.recipient || this.values.recipient).value;
    const fees = this.rollup.getTxFees(this.asset.id, txType);
    const speed = (changes.speed || this.values.speed).value;
    const fee = fees[speed].fee;
    const { spendableBalance } = this.assetState;
    const maxAmount = min(max(0n, spendableBalance - fee), this.txAmountLimit);
    const selectedAmount = (changes.selectedAmount || this.values.selectedAmount).value;
    const amountInput = changes.amount || this.values.amount;
    const amount = selectedAmount
      ? fromBaseUnits(max(0n, selectedAmount - fee), this.asset.decimals)
      : amountInput.value;

    const toUpdate = this.validateChanges({
      maxAmount: { value: maxAmount },
      fees: { value: fees },
      ...changes,
      amount: { ...amountInput, value: amount },
    });

    this.updateFormValues(toUpdate);
  }

  private validateChanges(changes: Partial<SendFormValues>) {
    const toUpdate = clearMessages(changes);

    if (changes.amount) {
      const amountInput = changes.amount;
      const preferredFractionalDigits = getAssetPreferredFractionalDigits(this.asset.address);
      if (preferredFractionalDigits !== undefined) {
        if ((amountInput.value.split('.')[1]?.length ?? 0) > preferredFractionalDigits) {
          toUpdate.amount = withError(
            amountInput,
            `Please enter no more than ${preferredFractionalDigits} decimal places.`,
          );
        }
      }
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

    if (changes.recipient && isAddress(changes.recipient.value.input)) {
      const recipient = EthAddress.fromString(changes.recipient.value.input);
      if (this.transactionGraph.isDepositor(recipient)) {
        toUpdate.privacyIssue = { value: 'already-deposited-from' };
        toUpdate.recipient = withWarning(changes.recipient, 'You have deposited from this address before.');
      } else if (this.transactionGraph.isRecipient(recipient)) {
        toUpdate.privacyIssue = { value: 'already-withdrawn-to' };
        toUpdate.recipient = withWarning(changes.recipient, 'This address has received funds before.');
      } else {
        toUpdate.recipient = withMessage(
          changes.recipient,
          `To achieve maximum privacy, make sure this address has never deposited or received funds before.`,
        );
        toUpdate.privacyIssue = { value: 'none' };
      }
    }

    return toUpdate;
  }

  private async validateValues() {
    const form = { ...this.values };

    const recipient = form.recipient.value.input;

    // Generic message (for any bordercase)
    if (form.recipient.value.valid === ValueAvailability.INVALID) {
      form.recipient = withError(form.recipient, 'Invalid recipient.');
    }

    if (this.sendMode === SendMode.SEND) {
      if (!recipient) {
        form.recipient = withError(form.recipient, `Please enter recipient's username.`);
      } else if (isAddress(recipient)) {
        form.recipient = withError(form.recipient, `Recipient cannot be an Ethereum address.`);
      } else if (!(await this.accountUtils.isValidRecipient(recipient))) {
        form.recipient = withError(form.recipient, `Cannot find a user with username '${recipient}'.`);
      } else if (isSameAlias(recipient, this.alias)) {
        form.recipient = withError(form.recipient, 'Cannot send funds to yourself.');
      }
    } else if (this.sendMode === SendMode.WIDTHDRAW) {
      if (!recipient) {
        form.recipient = withError(form.recipient, `Please enter recipient's Ethereum address.`);
      } else if (!isAddress(recipient)) {
        form.recipient = withError(form.recipient, `Recipient is not an Ethereum address.`);
      }
    }

    const fee = form.fees.value[form.speed.value].fee;
    const txType = await this.getRecipientTxType(recipient);
    if (this.status === SendStatus.VALIDATE) {
      // This error won't be displayed in the form but should trigger a "Session Expired" error in the confirm step.
      const currentFee = this.rollup.getFee(this.asset.id, txType, form.speed.value);
      if (fee < currentFee) {
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
      const balance = await this.sdk.getBalance(this.asset.id, this.userId);
      const maxAmount = min(max(0n, balance - fee), this.txAmountLimit);
      if (amount > maxAmount) {
        form.amount = withError(form.amount, `Insufficient zk${this.asset.symbol} Balance.`);
      }
    }

    return form;
  }

  private async createProof(privateKey: Buffer) {
    this.updateFormValues({ status: { value: SendStatus.VALIDATE }, submit: clearMessage({ value: true }) });

    const validated = await this.validateValues();
    if (!isValidForm(validated)) {
      this.updateFormValues(mergeValues(validated, { status: { value: SendStatus.CONFIRM } }));
      return;
    }

    this.updateFormStatus(FormStatus.PROCESSING);

    try {
      const recipient = this.values.recipient.value.input;
      if (isAddress(recipient)) {
        await this.publicSend(EthAddress.fromString(recipient.trim()), privateKey);
      } else {
        await this.privateSend(formatAliasInput(recipient), privateKey);
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

  private async privateSend(alias: string, privateKey: Buffer) {
    if (this.status <= SendStatus.CREATE_PROOF) {
      this.proceed(SendStatus.CREATE_PROOF);

      const signer = await this.sdk.createSchnorrSigner(privateKey);
      const noteRecipient = await this.accountUtils.getAccountId(alias);
      const amount = toBaseUnits(this.values.amount.value, this.asset.decimals);
      const fee = this.values.fees.value[this.values.speed.value].fee;
      this.proofController = await this.sdk.createTransferController(
        this.userId,
        signer,
        { assetId: this.asset.id, value: amount },
        { assetId: this.asset.id, value: fee },
        noteRecipient!,
      );
      await this.proofController.createProof();
    }

    this.proceed(SendStatus.SEND_PROOF);

    try {
      await this.proofController!.send();
    } catch (e) {
      debug(e);
      return this.abort(`Failed to send the proof: ${e.message}`);
    }

    this.proceed(SendStatus.DONE);
  }

  private async publicSend(ethAddress: EthAddress, privateKey: Buffer) {
    if (this.status <= SendStatus.CREATE_PROOF) {
      this.proceed(SendStatus.CREATE_PROOF);

      const signer = await this.sdk.createSchnorrSigner(privateKey);
      const amount = toBaseUnits(this.values.amount.value, this.asset.decimals);
      const fee = this.values.fees.value[this.values.speed.value].fee;
      this.proofController = await this.sdk.createWithdrawController(
        this.userId,
        signer,
        { assetId: this.asset.id, value: amount },
        { assetId: this.asset.id, value: fee },
        ethAddress,
      );
      await this.proofController.createProof();
    }

    this.proceed(SendStatus.SEND_PROOF);

    try {
      await this.proofController!.send();
    } catch (e) {
      debug(e);
      return this.abort(`Failed to send the proof: ${e.message}`);
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

  private async initTransactionGraph() {
    const userIds = (await this.sdk.getUsersData()).map(u => u.id);
    const jsTxs = (await Promise.all(userIds.map(userId => this.sdk.getPaymentTxs(userId)))).flat();
    this.transactionGraph = new TransactionGraph(jsTxs);
    this.refreshValues();
  }

  private onRollupStatusChange = () => {
    if (!this.locked) {
      this.refreshValues();
    }
  };

  private onProviderStateChange = async () => {
    if (this.status === SendStatus.GENERATE_KEY) {
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
      if (!this.destroyed && this.status === SendStatus.GENERATE_KEY && provider === this.provider) {
        await this.createProof(privateKey);
      }
    } catch (e) {
      if (this.status === SendStatus.GENERATE_KEY && provider === this.provider) {
        this.updateFormValues({ status: { value: SendStatus.CONFIRM }, submit: clearMessage({ value: true }) });
      }
    }
  }

  private updateRecipientStatus = async () => {
    const recipient = this.values.recipient.value.input;
    if (isAddress(recipient)) return;

    const valid = (await this.accountUtils.isValidRecipient(recipient))
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

  private prompt(message: string) {
    this.updateFormValues({
      submit: withWarning({ value: true }, message),
    });
  }

  private abort(message: string) {
    this.updateFormValues({
      submit: withError({ value: false }, message),
    });
  }
}
