import { AccountId, AssetId, EthAddress, Note, SdkEvent, TxType, WalletSdk } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { debounce, DebouncedFunc, uniqWith } from 'lodash';
import {
  initialMergeForm,
  initialSendForm,
  initialShieldForm,
  MergeForm,
  MergeStatus,
  SendForm,
  SendStatus,
  ShieldForm,
  ShieldStatus,
  ValueAvailability,
} from './account_forms';
import { AccountAction, AccountTx, JoinSplitTx, parseAccountTx, parseJoinSplitTx } from './account_txs';
import { formatAliasInput, isValidAliasInput } from './alias';
import { Asset, assets } from './assets';
import { Database } from './database';
import {
  applyChange,
  applyInputError,
  Form,
  isValidForm,
  mergeForm,
  validateForm,
  withError,
  withMessage,
  withWarning,
} from './form';
import { GraphQLService } from './graphql_service';
import { Provider, ProviderEvent } from './provider';
import { fromBaseUnits, max, min, sum, toBaseUnits } from './units';
import { Web3Signer } from './wallet_providers';

const debug = createDebug('zm:account');

const sumNotes = (notes: Note[]) => notes.reduce((sum, note) => sum + note.value, 0n);

export interface AccountState {
  ethAddress?: EthAddress;
  alias: string;
  asset: Asset;
  balance: bigint;
  spendableNotes: Note[];
  spendableBalance: bigint;
  publicBalance: bigint;
  accountTxs: AccountTx[];
  joinSplitTxs: JoinSplitTx[];
  txsPublishTime?: Date;
  settled: boolean;
}

export enum AccountEvent {
  UPDATED_ACTION_STATE = 'UPDATED_ACTION_STATE',
  UPDATED_ACCOUNT_STATE = 'UPDATED_ACCOUNT_STATE',
  UPDATED_FORM_INPUTS = 'UPDATED_FORM_INPUTS',
}

export const initialAccountState = {
  ethAddress: undefined,
  alias: '',
  asset: assets[AssetId.ETH],
  balance: 0n,
  spendableNotes: [],
  spendableBalance: 0n,
  publicBalance: 0n,
  accountTxs: [],
  joinSplitTxs: [],
  txsPublishTime: undefined,
  settled: false,
};

export interface Account {
  on(
    event: AccountEvent.UPDATED_ACTION_STATE,
    listener: (action: AccountAction, locked: boolean, processing: boolean) => void,
  ): this;
  on(event: AccountEvent.UPDATED_ACCOUNT_STATE, listener: (state: AccountState) => void): this;
  on(event: AccountEvent.UPDATED_FORM_INPUTS, listener: (action: AccountAction, form: Form) => void): this;
}

export class Account extends EventEmitter {
  private accountState: AccountState = initialAccountState;
  private asset!: Asset;
  private forms = {
    [AccountAction.SHIELD]: initialShieldForm,
    [AccountAction.SEND]: initialSendForm,
    [AccountAction.MERGE]: initialMergeForm,
  };
  private activeAction?: AccountAction;
  private lockAction = false;
  private processingAction = false;
  private debounceRefreshAccountState: DebouncedFunc<() => void>;
  private debounceUpdateSettledIn: DebouncedFunc<() => void>;
  private debounceUpdateShieldRecipient: DebouncedFunc<() => void>;
  private debounceUpdateSendRecipient: DebouncedFunc<() => void>;
  private debounceUpdateSendMinFee: DebouncedFunc<() => void>;

  private readonly settledInDebounceWait = 1000;
  private readonly aliasDebounceWait = 1000;
  private readonly minFeeDebounceWait = 200;

  constructor(
    public userId: AccountId,
    private alias: string,
    private sdk: WalletSdk,
    private provider: Provider,
    private db: Database,
    private graphql: GraphQLService,
    private readonly graphqlEndpoint: string,
    private readonly depositLimit: bigint,
    private readonly rollupPublishInterval: number,
  ) {
    super();
    this.accountState.alias = alias;
    this.debounceRefreshAccountState = debounce(this.refreshAccountState, 100);
    this.debounceUpdateSettledIn = debounce(this.updateSettledIn, this.settledInDebounceWait);
    this.debounceUpdateShieldRecipient = debounce(
      () => this.updateRecipientStatus(AccountAction.SHIELD),
      this.aliasDebounceWait,
    );
    this.debounceUpdateSendRecipient = debounce(
      () => this.updateRecipientStatus(AccountAction.SEND),
      this.aliasDebounceWait,
    );
    this.debounceUpdateSendMinFee = debounce(this.updateSendMinFee, this.minFeeDebounceWait);
  }

  getAccountState() {
    return this.accountState;
  }

  getAccountAction() {
    return this.activeAction;
  }

  isProcessingAction() {
    return this.processingAction;
  }

  async init(assetId = AssetId.ETH) {
    this.asset = assets[assetId];

    this.provider.on(ProviderEvent.UPDATED_ACCOUNT, this.handleEthAddressChange);
    await this.handleEthAddressChange(this.provider.account);

    this.sdk.on(SdkEvent.UPDATED_USER_STATE, this.handleUserStateChange);
    await this.refreshAccountState();
  }

  destroy() {
    this.removeAllListeners();
    this.provider.off(ProviderEvent.UPDATED_ACCOUNT, this.handleEthAddressChange);
    this.sdk.off(SdkEvent.UPDATED_USER_STATE, this.handleUserStateChange);
    this.debounceRefreshAccountState.cancel();
    this.debounceUpdateSettledIn.cancel();
    this.debounceUpdateShieldRecipient.cancel();
    this.debounceUpdateSendRecipient.cancel();
    this.debounceUpdateSendMinFee.cancel();
  }

  async changeAsset(assetId: AssetId) {
    if (assetId === this.asset.id) return;

    if (this.processingAction) {
      debug('Cannot switch asset while an action is being processed.');
      return;
    }

    this.debounceRefreshAccountState.cancel();
    this.activeAction = undefined;
    this.asset = assets[assetId];

    await this.handleUserStateChange(this.userId);
  }

  async changeProvider(provider: Provider) {
    this.provider.off(ProviderEvent.UPDATED_ACCOUNT, this.handleEthAddressChange);
    this.provider = provider;
    this.provider.on(ProviderEvent.UPDATED_ACCOUNT, this.handleEthAddressChange);
    await this.handleEthAddressChange(this.provider.account);
    await this.refreshAccountState();
  }

  async selectAction(action: AccountAction) {
    if (this.activeAction) {
      debug('Clear previous action before selecting another one.');
      return;
    }

    this.resetForm(action);
    this.updateActionState(action);
  }

  clearAction() {
    if (this.processingAction) {
      debug('Cannot clear action while it is being processed.');
      return;
    }

    this.updateActionState();
  }

  changeForm(action: AccountAction, newInputs: Form) {
    if (this.lockAction && action === this.activeAction) {
      debug('Cannot change form inputs while it is locked.');
      return;
    }

    const changes = { ...newInputs };
    if (newInputs.fee) {
      const form = this.forms[action];
      const fee = toBaseUnits(newInputs.fee.value, this.asset.decimals);
      const currentFee = toBaseUnits(form.fee.value, this.asset.decimals);
      if (!fee || fee < form.minFee.value) {
        this.debounceUpdateSettledIn.cancel();
        changes.settledIn = { value: { ...form.settledIn.value, valid: ValueAvailability.INVALID } };
      } else if (fee !== currentFee) {
        changes.settledIn = { value: { ...form.settledIn.value, valid: ValueAvailability.PENDING } };
        this.debounceUpdateSettledIn();
      }
    }
    switch (action) {
      case AccountAction.SHIELD: {
        if (newInputs.recipient) {
          const recipientInput = newInputs.recipient.value;
          this.debounceUpdateShieldRecipient.cancel();
          if (this.isUser(recipientInput)) {
            changes.recipientStatus = { value: { input: recipientInput, valid: true } };
          } else if (!isValidAliasInput(recipientInput)) {
            changes.recipientStatus = { value: { input: recipientInput, valid: false } };
          } else {
            this.debounceUpdateShieldRecipient();
          }
        }
        break;
      }
      case AccountAction.SEND: {
        if (newInputs.recipient) {
          this.debounceUpdateSendMinFee.cancel();
          this.debounceUpdateSendRecipient.cancel();
          const recipientInput = newInputs.recipient.value;
          const isEthAddress = EthAddress.isAddress(recipientInput.trim());
          if (isEthAddress || this.isUser(recipientInput) || !isValidAliasInput(recipientInput)) {
            changes.recipientStatus = { value: { input: recipientInput, valid: isEthAddress } };
          } else {
            this.debounceUpdateSendRecipient();
          }
          if (isEthAddress) {
            this.debounceUpdateSendMinFee();
          } else {
            const { minFeeTransfer, fee, minFee: prevMinFee, asset } = this.forms[action];
            const minFee = minFeeTransfer.value;
            changes.minFee = { value: minFee };

            const { decimals } = asset.value;
            if (toBaseUnits(fee.value, decimals) === prevMinFee.value) {
              // User hasn't changed the fee. Update it to the correct amount automatically.
              changes.fee = { value: fromBaseUnits(minFee, decimals) };
            }
          }
        }
        break;
      }
      default:
    }

    this.forms[action] = applyChange(this.forms[action], changes);
    this.emit(AccountEvent.UPDATED_FORM_INPUTS, action, this.forms[action]);
  }

  async validateForm(action: AccountAction) {
    if (this.lockAction && action === this.activeAction) {
      debug('Cannot validate a form while it is locked.');
      return;
    }

    this.updateForm(action, { submit: { value: true } });
    this.updateActionState(action, true);

    switch (action) {
      case AccountAction.SHIELD:
        this.forms[action] = await this.validateShieldForm(this.forms[action]);
        break;
      case AccountAction.SEND:
        this.forms[action] = await this.validateSendForm(this.forms[action]);
        break;
      case AccountAction.MERGE:
        this.forms[action] = await this.validateMergeForm(this.forms[action]);
        break;
      default:
    }

    if (!isValidForm(this.forms[action])) {
      this.updateActionState(action, false);
      this.updateForm(action, { submit: { value: false } });
      this.emit(AccountEvent.UPDATED_FORM_INPUTS, action, this.forms[action]);
      return;
    }

    switch (action) {
      case AccountAction.SHIELD:
        this.proceed(ShieldStatus.CONFIRM);
        break;
      case AccountAction.SEND:
        this.proceed(SendStatus.CONFIRM);
        break;
      case AccountAction.MERGE:
        this.proceed(MergeStatus.CONFIRM);
        break;
      default:
    }
  }

  async resetFormStep(action: AccountAction) {
    const checkAndReset = (fromStatus: any, toStatus: any) => {
      if (this.forms[action].status.value !== fromStatus) {
        throw new Error(`Form status not in ${fromStatus}.`);
      }

      this.updateActionState(action, false);
      this.updateForm(action, {
        status: { value: toStatus },
        submit: { value: false },
      });
    };

    switch (action) {
      case AccountAction.SHIELD:
        checkAndReset(ShieldStatus.CONFIRM, ShieldStatus.NADA);
        break;
      case AccountAction.SEND:
        checkAndReset(SendStatus.CONFIRM, SendStatus.NADA);
        break;
      case AccountAction.MERGE:
        checkAndReset(MergeStatus.CONFIRM, MergeStatus.NADA);
        break;
      default:
    }
  }

  async submitForm(action: AccountAction) {
    if (!this.lockAction || action !== this.activeAction) {
      debug('Cannot submit a form before it has been validated.');
      return;
    }

    this.updateActionState(action, true, true);

    try {
      switch (action) {
        case AccountAction.SHIELD:
          await this.submitShieldForm(this.forms[action]);
          break;
        case AccountAction.SEND:
          await this.submitSendForm(this.forms[action]);
          break;
        case AccountAction.MERGE:
          await this.submitMergeForm(this.forms[action]);
          break;
        default:
      }
    } catch (e) {
      debug(e);
      this.abort(`Something went wrong. This shouldn't happen.`);
    }

    this.updateActionState(action, false, false);
    this.updateForm(action, { submit: { value: false } });
  }

  private async resetForm(action: AccountAction) {
    switch (action) {
      case AccountAction.SHIELD:
        await this.resetShieldForm();
        break;
      case AccountAction.SEND:
        await this.resetSendForm();
        break;
      case AccountAction.MERGE:
        await this.resetMergeForm();
        break;
      default:
    }
  }

  private async resetShieldForm() {
    const action = AccountAction.SHIELD;
    const isActive = this.activeAction === action;
    const { publicBalance, spendableBalance, ethAddress } = this.accountState;
    const minFee = await this.sdk.getFee(this.asset.id, TxType.DEPOSIT);
    const maxAmount = min(max(0n, publicBalance - minFee), this.depositLimit);
    let updated: Form = {
      asset: { value: this.asset },
      minFee: { value: minFee },
      maxAmount: { value: maxAmount },
      depositLimit: { value: this.depositLimit },
      publicBalance: { value: publicBalance },
      spendableBalance: { value: spendableBalance },
      alias: { value: this.alias },
      ethAddress: { value: ethAddress ? ethAddress.toString() : '' },
    };
    if (!isActive) {
      updated = {
        ...updated,
        fee: { value: fromBaseUnits(minFee, this.asset.decimals) },
        settledIn: { value: { seconds: await this.getSettledIn(minFee, minFee), valid: ValueAvailability.VALID } },
        amount: { value: fromBaseUnits(maxAmount, this.asset.decimals) },
        recipient: { value: this.alias },
        recipientStatus: { value: { input: this.alias, valid: true } },
      };
    }

    this.forms[AccountAction.SHIELD] = applyChange(
      isActive ? this.forms[AccountAction.SHIELD] : initialShieldForm,
      updated,
    );
    this.emit(AccountEvent.UPDATED_FORM_INPUTS, AccountAction.SHIELD, this.forms[AccountAction.SHIELD]);
  }

  private async resetSendForm() {
    const action = AccountAction.SEND;
    const isActive = this.activeAction === action;
    const { spendableBalance } = this.accountState;
    const minFeeTransfer = await this.sdk.getFee(this.asset.id, TxType.TRANSFER);
    const minFeeWallet = await this.sdk.getFee(this.asset.id, TxType.WITHDRAW_TO_WALLET);
    const minFeeContract = await this.sdk.getFee(this.asset.id, TxType.WITHDRAW_TO_CONTRACT);
    const minFee = isActive ? this.forms[action].minFee.value : minFeeTransfer;
    let updated: Form = {
      asset: { value: this.asset },
      minFee: { value: minFee },
      minFeeTransfer: { value: minFeeTransfer },
      minFeeWallet: { value: minFeeWallet },
      minFeeContract: { value: minFeeContract },
      maxAmount: { value: spendableBalance - minFee },
    };
    if (!isActive) {
      updated = {
        ...updated,
        fee: { value: fromBaseUnits(minFee, this.asset.decimals) },
        settledIn: { value: { seconds: await this.getSettledIn(minFee, minFee), valid: ValueAvailability.VALID } },
      };
    }

    this.forms[AccountAction.SEND] = applyChange(isActive ? this.forms[action] : initialSendForm, updated);
    this.emit(AccountEvent.UPDATED_FORM_INPUTS, action, this.forms[action]);
  }

  private async resetMergeForm() {
    const isActive = this.activeAction === AccountAction.MERGE;
    const { spendableBalance } = this.accountState;
    const minFee = await this.sdk.getFee(this.asset.id, TxType.TRANSFER);
    const mergeOptions = this.getMergeOptions(minFee);
    let updated: Form = {
      asset: { value: this.asset },
      minFee: { value: minFee },
      spendableBalance: { value: spendableBalance },
      mergeOptions: { value: mergeOptions },
    };
    if (!isActive) {
      updated = {
        ...updated,
        toMerge: { value: [] },
        fee: { value: fromBaseUnits(minFee, this.asset.decimals) },
      };
    }

    this.forms[AccountAction.MERGE] = applyChange(
      isActive ? this.forms[AccountAction.MERGE] : initialMergeForm,
      updated,
    );
    this.emit(AccountEvent.UPDATED_FORM_INPUTS, AccountAction.MERGE, this.forms[AccountAction.MERGE]);
  }

  private async validateShieldForm(inputForm: ShieldForm) {
    const form = validateForm(inputForm);
    if (!isValidForm(form)) {
      return form;
    }

    const recipient = form.recipient.value;
    const outputNoteOwner = await this.getRecipientAccountId(recipient);
    if (!outputNoteOwner) {
      return applyInputError(form, 'recipient', `Cannot find a user with username '${recipient}'.`);
    }

    if (!EthAddress.isAddress(form.ethAddress.value)) {
      return applyInputError(form, 'ethAddress', 'Please connect an account from your wallet.');
    }

    const minFee = await this.sdk.getFee(this.asset.id, TxType.DEPOSIT);
    const decimals = form.asset.value.decimals;
    if (toBaseUnits(form.fee.value, decimals) < minFee) {
      return applyInputError(form, 'fee', `Fee cannot be less than ${fromBaseUnits(minFee, decimals)}.`);
    }

    return form;
  }

  private async validateSendForm(inputForm: SendForm) {
    const form = validateForm(inputForm);
    if (!isValidForm(form)) {
      return form;
    }

    const recipient = form.recipient.value;
    if (this.isUser(recipient)) {
      return applyInputError(form, 'recipient', 'Cannot send fund to yourself.');
    }

    const isPublicSend = this.isPublicSend(form);
    if (!isPublicSend && !(await this.getRecipientAccountId(recipient))) {
      return applyInputError(form, 'recipient', `Cannot find a user with username '${recipient}'.`);
    }

    const decimals = form.asset.value.decimals;
    const minFee = await this.getSendMinFee(form);
    if (toBaseUnits(form.fee.value, decimals) < minFee) {
      return applyInputError(form, 'fee', `Fee cannot be less than ${fromBaseUnits(minFee, decimals)}.`);
    }

    return form;
  }

  private async validateMergeForm(inputForm: MergeForm) {
    const form = validateForm(inputForm);
    if (!isValidForm(form)) {
      return form;
    }

    const mergeOptions = this.getMergeOptions(form.minFee.value);
    const toMerge = sum(form.toMerge.value);
    if (!mergeOptions.some(options => sum(options) === toMerge)) {
      return applyInputError(form, 'toMerge', 'Invalid merge. Balance has changed.');
    }

    const minFee = await this.sdk.getFee(this.asset.id, TxType.TRANSFER);
    const decimals = form.asset.value.decimals;
    if (toBaseUnits(form.fee.value, decimals) < minFee) {
      return applyInputError(form, 'fee', `Fee cannot be less than ${fromBaseUnits(minFee, decimals)}.`);
    }

    return form;
  }

  private async submitShieldForm(form: ShieldForm) {
    this.forms[AccountAction.SHIELD] = await this.validateShieldForm(form);
    if (!isValidForm(this.forms[AccountAction.SHIELD])) {
      this.emit(AccountEvent.UPDATED_FORM_INPUTS, AccountAction.SHIELD, this.forms[AccountAction.SHIELD]);
      return;
    }

    const recipient = form.recipient.value;
    const outputNoteOwner = (await this.getRecipientAccountId(recipient))!;
    const amount = toBaseUnits(form.amount.value, this.asset.decimals);
    const fee = toBaseUnits(form.fee.value, this.asset.decimals);
    const publicInput = amount + fee;
    const ethAddress = EthAddress.fromString(form.ethAddress.value);
    const deposited = await this.sdk.getUserPendingDeposit(this.asset.id, ethAddress);
    const pendingDeposit = await this.graphql.getPendingDeposit(this.asset.id, ethAddress);
    const toBeDeposited = max(publicInput + pendingDeposit - deposited, 0n);

    this.updateForm(AccountAction.SHIELD, {
      toBeDeposited: { value: toBeDeposited },
    });
    this.proceed(toBeDeposited ? ShieldStatus.DEPOSIT : ShieldStatus.CREATE_PROOF);

    if (toBeDeposited) {
      this.prompt(
        `Please make a deposit of ${fromBaseUnits(toBeDeposited, this.asset.decimals)} ${
          this.asset.symbol
        } from your wallet.`,
      );

      try {
        await this.sdk.depositFundsToContract(this.asset.id, ethAddress, toBeDeposited);
      } catch (e) {
        debug(e);
        return this.abort('Failed to deposit from your wallet.');
      }
    }

    this.proceed(ShieldStatus.CREATE_PROOF);

    const userData = this.sdk.getUserData(this.userId);
    const senderId = this.accountState.settled ? this.userId : new AccountId(this.userId.publicKey, 0);
    const signer = this.sdk.createSchnorrSigner(userData.privateKey);
    const privateInput =
      form.enableAddToBalance.value && form.addToBalance.value
        ? await this.sdk.getMaxSpendableValue(this.asset.id, this.userId)
        : 0n;
    const toBeShielded = amount + privateInput;
    const [recipientPrivateOutput, senderPrivateOutput] = senderId.equals(outputNoteOwner)
      ? [0n, toBeShielded]
      : [toBeShielded, 0n];
    const proofOutput = await this.sdk.createJoinSplitProof(
      this.asset.id,
      senderId,
      publicInput,
      0n,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      signer,
      outputNoteOwner,
      ethAddress,
    );

    this.proceed(ShieldStatus.APPROVE_PROOF);

    this.prompt('Please sign the proof data in your wallet.');
    try {
      const signer = new Web3Signer(this.provider.ethereumProvider);
      await proofOutput.ethSign(signer as any, ethAddress);
    } catch (e) {
      debug(e);
      return this.abort('Failed to sign the proof.');
    }

    this.proceed(ShieldStatus.SEND_PROOF);

    try {
      await this.sdk.sendProof(proofOutput);
    } catch (e) {
      debug(e);
      return this.abort('Failed to send the proof.');
    }

    if (!senderId.equals(this.userId)) {
      await this.db.addMigratingTx(senderId, {
        ...proofOutput.tx,
        userId: outputNoteOwner,
        ownedByUser: false,
      });
    }

    this.proceed(ShieldStatus.DONE);
  }

  private async submitSendForm(form: SendForm) {
    const recipient = form.recipient.value.trim();
    if (this.isPublicSend(form)) {
      await this.publicSend(form, EthAddress.fromString(recipient));
    } else {
      await this.privateSend(form, recipient);
    }
  }

  private async privateSend(form: SendForm, alias: string) {
    this.proceed(SendStatus.CREATE_PROOF);

    const userData = this.sdk.getUserData(this.userId);
    const signer = this.sdk.createSchnorrSigner(userData.privateKey);
    const noteRecipient = await this.getRecipientAccountId(alias);
    const amount = toBaseUnits(form.amount.value, this.asset.decimals);
    const fee = toBaseUnits(form.fee.value, this.asset.decimals);
    const proofOutput = await this.sdk.createJoinSplitProof(
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

    this.proceed(SendStatus.SEND_PROOF);

    try {
      await this.sdk.sendProof(proofOutput);
    } catch (e) {
      debug(e);
      return this.abort('Failed to send the proof.');
    }

    this.proceed(SendStatus.DONE);
  }

  private async publicSend(form: SendForm, recipient: EthAddress) {
    this.proceed(SendStatus.CREATE_PROOF);

    const userData = this.sdk.getUserData(this.userId);
    const signer = this.sdk.createSchnorrSigner(userData.privateKey);
    const amount = toBaseUnits(form.amount.value, this.asset.decimals);
    const fee = toBaseUnits(form.fee.value, this.asset.decimals);
    const proofOutput = await this.sdk.createJoinSplitProof(
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
      recipient,
    );

    this.proceed(SendStatus.SEND_PROOF);

    try {
      await this.sdk.sendProof(proofOutput);
    } catch (e) {
      debug(e);
      return this.abort('Failed to send the proof.');
    }

    this.proceed(SendStatus.DONE);
  }

  private async submitMergeForm(form: MergeForm) {
    this.proceed(MergeStatus.CREATE_PROOF);

    const toMerge = sum(form.toMerge.value.slice(0, 2));
    const fee = toBaseUnits(form.fee.value, this.asset.decimals);
    const userData = this.sdk.getUserData(this.userId);
    const signer = this.sdk.createSchnorrSigner(userData.privateKey);

    const proofOutput = await this.sdk.createJoinSplitProof(
      this.asset.id,
      this.userId,
      0n,
      0n,
      toMerge,
      0n,
      toMerge - fee,
      signer,
    );

    this.proceed(MergeStatus.SEND_PROOF);

    try {
      await this.sdk.sendProof(proofOutput);
    } catch (e) {
      debug(e);
      return this.abort('Failed to send the proof.');
    }

    this.proceed(MergeStatus.DONE);
  }

  private updateRecipientStatus = async (action: AccountAction) => {
    const recipientInput = this.forms[action].recipient.value;
    const valid = await this.isValidRecipient(recipientInput);
    if (this.activeAction === action && recipientInput === this.forms[action].recipient.value) {
      this.updateForm(action, { recipientStatus: { value: { input: recipientInput, valid } } });
    }
  };

  private updateSendMinFee = async () => {
    const action = AccountAction.SEND;
    const { recipient, fee, minFee: prevMinFee, minFeeTransfer, minFeeContract, minFeeWallet, asset } = this.forms[
      action
    ];
    const recipientAddress = recipient.value;

    let minFee: bigint;
    if (!EthAddress.isAddress(recipientAddress)) {
      minFee = minFeeTransfer.value;
    } else if (await this.isContract(EthAddress.fromString(recipientAddress))) {
      minFee = minFeeContract.value;
    } else {
      minFee = minFeeWallet.value;
    }
    this.updateForm(action, { minFee: { value: minFee } });

    const decimals = asset.value.decimals;
    const feeValue = toBaseUnits(fee.value, decimals);
    if (feeValue === prevMinFee.value) {
      // User hasn't changed the fee. Update it to the correct amount automatically.
      this.updateForm(action, { fee: { value: fromBaseUnits(minFee, decimals) } });
    } else if (feeValue < minFee) {
      this.updateForm(action, { fee: withError(fee, `Fee cannot be less than ${fromBaseUnits(minFee, decimals)}.`) });
    }
  };

  private updateSettledIn = async () => {
    if (!this.activeAction) return;
    const action = this.activeAction;
    const fee = toBaseUnits(this.forms[action].fee.value, this.forms[action].asset.value.decimals);
    const minFee = this.forms[action].minFee.value;
    const seconds = await this.getSettledIn(minFee, fee);
    if (action === this.activeAction) {
      this.updateForm(action, { settledIn: { value: { seconds, valid: ValueAvailability.VALID } } });
    }
  };

  private isUser(alias: string) {
    return formatAliasInput(alias) === formatAliasInput(this.alias);
  }

  private async isValidRecipient(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return false;
    }

    const alias = formatAliasInput(aliasInput);
    if (this.isUser(aliasInput) || !!(await this.sdk.getAddressFromAlias(alias))) {
      return true;
    }

    return !!(await this.getPendingAccountId(alias));
  }

  private async getRecipientAccountId(aliasInput: string) {
    if (this.isUser(aliasInput)) {
      return this.userId;
    }

    if (!isValidAliasInput(aliasInput)) {
      return undefined;
    }

    const alias = formatAliasInput(aliasInput);
    try {
      const accountId = await this.sdk.getAccountId(alias);
      if (accountId.nonce > 0) {
        return accountId;
      }
    } catch (e) {
      // getAccountId will throw if alias is not registered.
    }

    return this.getPendingAccountId(alias);
  }

  private async getSettledIn(minFee: bigint, fee: bigint) {
    const { nextPublishTime, pendingTxCount, txsPerRollup, minFees } = await this.sdk.getRemoteStatus();
    const goneBy = Math.max(
      0,
      nextPublishTime ? this.rollupPublishInterval - Math.ceil((nextPublishTime.getTime() - Date.now()) / 1000) : 0,
    );
    const queuedRollups = Math.floor(pendingTxCount / txsPerRollup);
    const baseSettleTime = Math.max(0, queuedRollups * this.rollupPublishInterval - goneBy);
    const baseFee = minFees[this.asset.id][TxType.TRANSFER];
    let settledIn = this.rollupPublishInterval - (queuedRollups ? 0 : goneBy);
    if (baseFee) {
      const expectedNewTxs = txsPerRollup - (pendingTxCount % txsPerRollup);
      const baseInterval = settledIn / expectedNewTxs;
      const advance = Number(min(BigInt(expectedNewTxs), (fee - (minFee - baseFee)) / baseFee));
      settledIn -= baseInterval * advance;
    }
    return baseSettleTime + settledIn;
  }

  private isPublicSend(form: SendForm) {
    const recipient = form.recipient.value.trim();
    return EthAddress.isAddress(recipient);
  }

  private async getSendMinFee(form: SendForm) {
    if (!this.isPublicSend(form)) {
      return this.sdk.getFee(form.asset.value.id, TxType.TRANSFER);
    }
    const recipient = form.recipient.value;
    const isContract = EthAddress.isAddress(recipient)
      ? await this.isContract(EthAddress.fromString(recipient))
      : false;
    return this.sdk.getFee(form.asset.value.id, isContract ? TxType.WITHDRAW_TO_CONTRACT : TxType.WITHDRAW_TO_WALLET);
  }

  private getMergeOptions(fee: bigint) {
    const { spendableNotes, spendableBalance } = this.accountState;
    return [spendableNotes.slice(-3)]
      .filter(notes => sumNotes(notes) - fee > spendableBalance)
      .map(notes => notes.reduce((values, note) => [...values, note.value], [] as bigint[]));
  }

  private handleEthAddressChange = async (ethAddress?: EthAddress) => {
    const publicBalance = ethAddress ? await this.sdk.getPublicBalance(this.asset.id, ethAddress) : 0n;
    await this.updateAccountState({ ethAddress, publicBalance });
  };

  private handleUserStateChange = async (userId: AccountId) => {
    // We might need to show the join-split txs from previous nonce.
    if (!userId.equals(this.userId) && !userId.equals(new AccountId(this.userId.publicKey, this.userId.nonce - 1))) {
      return;
    }

    this.debounceRefreshAccountState();
  };

  private refreshAccountState = async () => {
    const accountTxs = (await this.sdk.getAccountTxs(this.userId)).map(tx => parseAccountTx(tx, this.graphqlEndpoint));
    const settled = accountTxs.length > 1 || !!accountTxs[0]?.settled;
    let txsPublishTime = accountTxs.some(tx => !tx.settled)
      ? (await this.sdk.getRemoteStatus()).nextPublishTime || new Date(Date.now() + this.rollupPublishInterval * 1000)
      : undefined;

    const asset = this.asset;
    if (!asset.enabled) {
      await this.updateAccountState({
        ...initialAccountState,
        asset,
        accountTxs,
        txsPublishTime,
        settled,
      });
      return;
    }

    const { ethAddress } = this.accountState;
    const balance = this.sdk.getBalance(asset.id, this.userId);
    const spendableNotes = await this.sdk.getSpendableNotes(asset.id, this.userId);
    const spendableBalance = sumNotes(spendableNotes.slice(-2));
    const publicBalance = ethAddress ? await this.sdk.getPublicBalance(asset.id, ethAddress) : 0n;
    const userJoinSplitTxs = await this.getJoinSplitTxs(this.userId);
    const prevUserId = new AccountId(this.userId.publicKey, this.userId.nonce - 1);
    if (this.isUserAdded(prevUserId)) {
      const migratingTxs = await this.db.getMigratingTxs(this.userId);
      const prevTxs = await this.getJoinSplitTxs(prevUserId);
      if (prevTxs.some(tx => !tx.settled)) {
        userJoinSplitTxs.push(...migratingTxs.concat(prevTxs));
      } else if (settled) {
        await this.db.removeMigratingTxs(this.userId);
        await this.sdk.removeUser(prevUserId);
      }
    }
    if (!txsPublishTime && userJoinSplitTxs.some(tx => !tx.settled)) {
      txsPublishTime =
        (await this.sdk.getRemoteStatus()).nextPublishTime || new Date(Date.now() + this.rollupPublishInterval * 1000);
    }

    await this.updateAccountState({
      asset,
      balance,
      spendableNotes,
      spendableBalance,
      publicBalance,
      accountTxs,
      joinSplitTxs: uniqWith(userJoinSplitTxs, (tx0, tx1) => tx0.txHash.equals(tx1.txHash))
        .sort((a, b) => (!a.settled && b.settled ? -1 : 0))
        .map(tx => parseJoinSplitTx(tx, this.graphqlEndpoint)),
      txsPublishTime,
      settled,
    });
  };

  private async updateAccountState(accountState: Partial<AccountState>) {
    this.accountState = { ...this.accountState, ...accountState };

    await this.resetShieldForm();
    await this.resetSendForm();
    await this.resetMergeForm();

    this.emit(AccountEvent.UPDATED_ACCOUNT_STATE, this.accountState);
  }

  private updateActionState(action?: AccountAction, locked = false, processing = false) {
    this.activeAction = action;
    this.lockAction = locked;
    this.processingAction = processing;
    this.emit(AccountEvent.UPDATED_ACTION_STATE, this.activeAction, locked, processing);
  }

  private updateForm(action: AccountAction, newInputs: Form) {
    this.forms[action] = mergeForm(this.forms[action], newInputs);
    this.emit(AccountEvent.UPDATED_FORM_INPUTS, action, this.forms[action]);
  }

  private abort(error: string) {
    this.updateForm(this.activeAction!, {
      submit: withError({ value: false }, error),
    });
  }

  private prompt(message: string) {
    this.updateForm(this.activeAction!, {
      submit: withWarning({ value: true }, message),
    });
  }

  private proceed(status: ShieldStatus | SendStatus | MergeStatus, message = '') {
    this.updateForm(this.activeAction!, {
      status: { value: status },
      submit: withMessage({ value: true }, message),
    });
  }

  // TODO - Find a way to get pending account's public key without having to compute its alias hash or send the alias to server.
  private async getPendingAccountId(alias: string) {
    const aliasHash = (this.sdk as any).core.computeAliasHash(alias);
    return this.graphql.getPendingAccountId(aliasHash);
  }

  private async getJoinSplitTxs(userId: AccountId) {
    return this.isUserAdded(userId)
      ? (await this.sdk.getJoinSplitTxs(userId)).filter(tx => tx.assetId === this.asset.id)
      : [];
  }

  // yuck
  private isUserAdded(userId: AccountId) {
    try {
      this.sdk.getUserData(userId);
      return true;
    } catch (e) {
      return false;
    }
  }

  private async isContract(address: EthAddress) {
    const web3provider = new Web3Provider(this.provider.ethereumProvider);
    const result = await web3provider.getCode(address.toString());
    return result.toString() !== '0x';
  }
}
