import { AccountId, TxType, WalletSdk } from '@aztec/sdk';
import { JoinSplitProofOutput } from '@aztec/sdk/proofs/proof_output';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { debounce, DebouncedFunc } from 'lodash';
import { AccountState, AssetState } from '../account_state';
import { AccountUtils } from '../account_utils';
import { isSameAlias, isValidAliasInput } from '../alias';
import { Asset } from '../assets';
import { Database } from '../database';
import {
  BigIntValue,
  BoolInput,
  clearMessage,
  clearMessages,
  formatBigIntInput,
  FormStatus,
  FormValue,
  IntValue,
  isStrictValidDecimal,
  isValidForm,
  mergeValues,
  StrInput,
  ValueAvailability,
  withError,
  withMessage,
  withWarning,
} from '../form';
import { Network } from '../networks';
import { Provider, ProviderEvent, ProviderState } from '../provider';
import { RollupService, RollupServiceEvent } from '../rollup_service';
import { fromBaseUnits, max, min, toBaseUnits } from '../units';
import { Web3Signer } from '../wallet_providers';
import { AccountForm, AccountFormEvent } from './account_form';
import { EthAccount, EthAccountEvent, EthAccountState } from './eth_account';

const debug = createDebug('zm:shield_form');

export enum ShieldStatus {
  NADA,
  CONFIRM,
  VALIDATE,
  DEPOSIT,
  CREATE_PROOF,
  APPROVE_PROOF,
  SEND_PROOF,
  DONE,
}

interface RecipientInput extends FormValue {
  value: {
    input: string;
    valid: ValueAvailability;
  };
}

interface EthAccountStateValue extends FormValue {
  value: EthAccountState;
}

export interface ShieldFormValues {
  amount: StrInput;
  maxAmount: BigIntValue;
  fee: StrInput;
  settledIn: IntValue;
  ethAccount: EthAccountStateValue;
  recipient: RecipientInput;
  enableAddToBalance: BoolInput;
  addToBalance: BoolInput;
  confirmed: BoolInput;
  status: {
    value: ShieldStatus;
  };
  submit: BoolInput;
}

const initialShieldFormValues = {
  amount: {
    value: '',
    required: true,
  },
  maxAmount: {
    value: 0n,
  },
  fee: {
    value: '',
  },
  settledIn: {
    value: 0,
  },
  ethAccount: {
    value: {
      address: undefined,
      publicBalance: 0n,
      pendingBalance: 0n,
    },
  },
  recipient: {
    value: {
      input: '',
      valid: ValueAvailability.INVALID,
    },
  },
  enableAddToBalance: {
    value: false,
  },
  addToBalance: {
    value: false,
  },
  confirmed: {
    value: false,
    required: true,
  },
  status: {
    value: ShieldStatus.NADA,
  },
  submit: {
    value: false,
  },
};

export class ShieldForm extends EventEmitter implements AccountForm {
  private readonly userId: AccountId;
  private readonly alias: string;
  private readonly asset: Asset;

  private values: ShieldFormValues = initialShieldFormValues;
  private formStatus = FormStatus.ACTIVE;
  private proofOutput?: JoinSplitProofOutput;

  private ethAccount!: EthAccount;
  private depositGasCost = 0n;
  private minFee = 0n;

  private debounceUpdateRecipient: DebouncedFunc<() => void>;
  private depositGasCostSubscriber?: number;

  private readonly depositGasCostInterval = 60000;
  private readonly aliasDebounceWait = 1000;

  constructor(
    private accountState: AccountState,
    private assetState: AssetState,
    private sdk: WalletSdk,
    private db: Database,
    private coreProvider: Provider,
    private provider: Provider | undefined,
    private rollup: RollupService,
    private accountUtils: AccountUtils,
    private readonly requiredNetwork: Network,
    private readonly txAmountLimit: bigint,
  ) {
    super();
    this.userId = accountState.userId;
    this.alias = accountState.alias;
    this.asset = assetState.asset;
    this.ethAccount = new EthAccount(provider, sdk, accountUtils, this.asset.id);
    this.debounceUpdateRecipient = debounce(this.updateRecipientStatus, this.aliasDebounceWait);
    this.values.recipient = { value: { input: this.alias, valid: ValueAvailability.VALID } };
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
    this.unsubscribeToDepositGasCost();
    this.ethAccount?.destroy();
    this.rollup.off(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    this.provider?.off(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.debounceUpdateRecipient.cancel();
  }

  async init() {
    this.rollup.on(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    this.provider?.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    await this.renewEthAccount();
    await this.subscribeToDepositGasCost();
    this.refreshValues();
    const maxAmount = this.values.maxAmount.value;
    if (maxAmount) {
      this.updateFormValues({ amount: { value: fromBaseUnits(maxAmount, this.asset.decimals) } });
    }
  }

  changeAccountState(accountState: AccountState) {
    if (!accountState.userId.equals(this.userId)) {
      throw new Error('Cannot change user of a form.');
    }

    this.accountState = accountState;
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
    this.onProviderStateChange(this.provider?.getState());
  }

  changeValues(newValues: Partial<ShieldFormValues>) {
    if (this.locked) {
      debug('Cannot change form values while it is locked.');
      return;
    }

    const changes = { ...newValues };
    if (changes.amount) {
      changes.amount = formatBigIntInput(changes.amount);
    }
    if (changes.fee) {
      changes.fee = formatBigIntInput(changes.fee);
    }
    if (changes.recipient) {
      this.debounceUpdateRecipient.cancel();

      const recipientInput = changes.recipient.value.input;
      let valid = ValueAvailability.PENDING;
      if (isSameAlias(recipientInput, this.alias)) {
        valid = ValueAvailability.VALID;
      } else if (!isValidAliasInput(recipientInput)) {
        valid = ValueAvailability.INVALID;
      }
      changes.recipient = { value: { input: recipientInput, valid } };
    }

    this.refreshValues(changes);

    if (changes.recipient?.value.valid === ValueAvailability.PENDING) {
      this.debounceUpdateRecipient();
    }
  }

  unlock() {
    if (this.processing) {
      debug('Cannot unlock a form while it is being processed.');
      return;
    }

    this.refreshValues({
      status: { value: ShieldStatus.NADA },
      submit: clearMessage({ value: false }),
    });
    this.updateFormStatus(FormStatus.ACTIVE);
    this.renewEthAccount();
  }

  async lock() {
    this.updateFormValues({ submit: { value: true } });

    this.updateFormStatus(FormStatus.LOCKED);

    const validated = await this.validateValues();
    if (isValidForm(validated)) {
      this.ethAccount.destroy();
      this.updateFormValues({ status: { value: ShieldStatus.CONFIRM } });
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

    const status = Math.max(this.values.status.value, ShieldStatus.VALIDATE);
    this.updateFormValues({ status: { value: status }, submit: clearMessage({ value: true }) });

    const validated = await this.validateValues();
    if (!isValidForm(validated)) {
      this.updateFormValues(mergeValues(validated, { status: { value: ShieldStatus.CONFIRM } }));
      return;
    }

    this.updateFormStatus(FormStatus.PROCESSING);

    try {
      await this.shield();
      this.updateFormValues({ submit: { value: false } });
    } catch (e) {
      debug(e);
      this.updateFormValues({
        submit: withError({ value: false }, `Something went wrong. This shouldn't happen.`),
      });
      return;
    }

    this.updateFormStatus(FormStatus.LOCKED);
  }

  private refreshValues(changes: Partial<ShieldFormValues> = {}) {
    const { spendableBalance } = this.assetState;
    const ethAccountState = this.ethAccount.state;
    const txType = TxType.DEPOSIT;

    const prevFee = toBaseUnits(this.values.fee.value, this.asset.decimals);
    const prevMinFee = this.minFee;
    const resetFee = !changes.fee && !this.locked && prevFee === prevMinFee;
    this.minFee = this.rollup.getMinFee(this.asset.id, txType);

    const { publicBalance, pendingBalance } = ethAccountState;
    const fee = changes.fee ? toBaseUnits(changes.fee.value, this.asset.decimals) : resetFee ? this.minFee : prevFee;
    const maxAmount = min(
      max(0n, publicBalance + pendingBalance - fee - this.depositGasCost, pendingBalance - fee),
      this.txAmountLimit,
    );
    const recipient = this.values.recipient.value.input;

    const toUpdate = this.validateChanges({
      maxAmount: { value: maxAmount },
      ethAccount: { value: ethAccountState },
      enableAddToBalance: {
        value: isSameAlias(recipient, this.alias) && spendableBalance > 0n,
      },
      settledIn: {
        value: this.rollup.getSettledIn(this.asset.id, txType, fee),
      },
      ...changes,
      ...(resetFee
        ? {
            fee: { value: fromBaseUnits(fee, this.asset.decimals) },
          }
        : {}),
    });

    this.updateFormValues(toUpdate);
  }

  private validateChanges(changes: Partial<ShieldFormValues>) {
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
      } else if (!this.provider && changes.amount.value) {
        toUpdate.amount = withError(amountInput, 'Please connect a wallet.');
      }
    } else if (this.accountUtils.isActiveProvider(this.provider)) {
      toUpdate.amount = clearMessage(this.values.amount);
    }

    if (changes.maxAmount && !toUpdate.amount?.message) {
      const amountInput = changes.amount || this.values.amount;
      const amountValue = toBaseUnits(amountInput.value, this.asset.decimals);
      if (amountValue > changes.maxAmount.value) {
        toUpdate.amount = withError(amountInput, `Insufficient ${this.asset.symbol} Balance.`);
      }
    }

    if (changes.ethAccount) {
      const { network } = changes.ethAccount.value;
      if (network && network.chainId !== this.requiredNetwork.chainId) {
        toUpdate.ethAccount = withError(changes.ethAccount, 'Wrong network.');
      }
    }

    if (changes.fee) {
      const feeInput = changes.fee.value;
      const fee = toBaseUnits(feeInput, this.asset.decimals);
      if (isStrictValidDecimal(feeInput) && fee < this.minFee) {
        toUpdate.fee = withError(
          changes.fee,
          `Fee cannot be less than ${fromBaseUnits(this.minFee, this.asset.decimals)}.`,
        );
      }
    }

    return toUpdate;
  }

  private async validateValues() {
    const form = { ...this.values };

    if (!form.confirmed.value) {
      form.confirmed = withError(form.confirmed, 'Please confirm that you understand the risk.');
    }

    const minFee = await this.sdk.getFee(this.asset.id, TxType.DEPOSIT);
    const fee = toBaseUnits(form.fee.value, this.asset.decimals);
    if (fee < minFee) {
      form.fee = withError(form.fee, `Fee cannot be less than ${fromBaseUnits(minFee, this.asset.decimals)}.`);
    }

    const isActiveProvider = this.accountUtils.isActiveProvider(this.provider);
    const amount = toBaseUnits(form.amount.value, this.asset.decimals);
    if (!isActiveProvider) {
      if (!this.provider) {
        form.amount = withError(form.amount, 'Please connect a wallet.');
      } else {
        form.amount = withError(form.amount, `Please switch your wallet's network to ${this.requiredNetwork.network}.`);
      }
    } else if (!amount) {
      form.amount = withError(form.amount, 'Amount must be greater than 0.');
    } else {
      const ethAddress = this.provider!.account!;
      const pendingBalance = await this.accountUtils.getPendingBalance(this.asset.id, ethAddress);
      const publicBalance = await this.sdk.getPublicBalance(this.asset.id, ethAddress);
      const depositGasCost =
        amount + fee > pendingBalance ? await this.rollup.getDepositGasCost(this.asset.id, amount, this.provider!) : 0n;
      const requiredPublicFund = max(0n, amount + fee + depositGasCost - pendingBalance);
      if (publicBalance < requiredPublicFund) {
        form.amount = withError(form.amount, `Insufficient ${this.asset.symbol} Balance.`);
      }
    }

    const recipient = form.recipient.value;
    const outputNoteOwner = await this.accountUtils.getAccountId(recipient.input);
    if (!outputNoteOwner) {
      form.recipient = withError(form.recipient, `Cannot find a user with username '${recipient.input}'.`);
    }

    return form;
  }

  private async shield() {
    const proceed = (status: ShieldStatus, message = '') => {
      this.updateFormValues({
        status: { value: status },
        submit: withMessage({ value: true }, message),
      });
    };

    const prompt = (message: string) => {
      this.updateFormValues({
        submit: withWarning({ value: true }, message),
      });
    };

    const abort = (message: string) => {
      this.updateFormValues({
        submit: withError({ value: false }, message),
      });
    };

    const form = this.values;
    const asset = this.asset;
    const recipient = form.recipient.value.input;
    const outputNoteOwner = (await this.accountUtils.getAccountId(recipient))!;
    const userData = this.sdk.getUserData(this.userId);
    const senderId = this.accountState.settled ? this.userId : new AccountId(userData.publicKey, 0);
    const amount = toBaseUnits(form.amount.value, asset.decimals);
    const fee = toBaseUnits(form.fee.value, asset.decimals);
    const publicInput = amount + fee;
    const ethAddress = this.provider!.account!;
    const pendingBalance = await this.accountUtils.getPendingBalance(asset.id, ethAddress);
    const toBeDeposited = max(publicInput - pendingBalance, 0n);

    if (toBeDeposited) {
      proceed(ShieldStatus.DEPOSIT);
      await new Promise(resolve => setTimeout(resolve, 1000));
      prompt(
        `Please make a deposit of ${fromBaseUnits(toBeDeposited, asset.decimals)} ${asset.symbol} from your wallet.`,
      );

      try {
        await this.sdk.setProvider(this.provider!.ethereumProvider);
        await this.sdk.depositFundsToContract(asset.id, ethAddress, toBeDeposited);
        await this.sdk.setProvider(this.coreProvider.ethereumProvider);
      } catch (e) {
        debug(e);
        await this.sdk.setProvider(this.coreProvider.ethereumProvider);
        return abort('Failed to deposit from your wallet.');
      }
    }

    if (this.status <= ShieldStatus.CREATE_PROOF) {
      proceed(ShieldStatus.CREATE_PROOF);

      const signer = this.sdk.createSchnorrSigner(userData.privateKey);
      const privateInput =
        form.enableAddToBalance.value && form.addToBalance.value
          ? await this.sdk.getMaxSpendableValue(asset.id, senderId)
          : 0n;
      const toBeShielded = amount + privateInput;
      const [recipientPrivateOutput, senderPrivateOutput] = senderId.equals(outputNoteOwner)
        ? [0n, toBeShielded]
        : [toBeShielded, 0n];
      this.proofOutput = await this.sdk.createJoinSplitProof(
        asset.id,
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
    }

    if (this.status <= ShieldStatus.APPROVE_PROOF) {
      proceed(ShieldStatus.APPROVE_PROOF);

      if (!this.provider) {
        return abort('Wallet disconnected.');
      }

      prompt('Please approve the proof data in your wallet.');
      try {
        const isContract = await this.sdk.isContract(ethAddress);
        if (isContract) {
          await this.sdk.approveProof(ethAddress, this.proofOutput!.signingData!);
        } else {
          const signer = new Web3Signer(this.provider.ethereumProvider);
          await this.proofOutput!.ethSign(signer as any, ethAddress);
        }
      } catch (e) {
        debug(e);
        return abort('Failed to sign the proof.');
      }
    }

    if (this.status <= ShieldStatus.SEND_PROOF) {
      proceed(ShieldStatus.SEND_PROOF);

      try {
        await this.sdk.sendProof(this.proofOutput!);
      } catch (e) {
        debug(e);
        return abort('Failed to send the proof.');
      }

      if (!senderId.equals(this.userId)) {
        await this.db.addMigratingTx(senderId, {
          ...this.proofOutput!.tx,
          userId: outputNoteOwner,
          ownedByUser: false,
        });
      }
    }

    proceed(ShieldStatus.DONE);
  }

  private updateRecipientStatus = async () => {
    const recipientInput = this.values.recipient.value.input;
    const valid = isSameAlias(recipientInput, this.alias) || !!(await this.accountUtils.getAccountId(recipientInput));
    if (recipientInput === this.values.recipient.value.input) {
      this.updateFormValues({
        recipient: {
          value: { input: recipientInput, valid: valid ? ValueAvailability.VALID : ValueAvailability.INVALID },
        },
      });
    }
  };

  private async renewEthAccount() {
    this.ethAccount.destroy();
    this.ethAccount = new EthAccount(this.provider, this.sdk, this.accountUtils, this.asset.id);
    this.ethAccount.on(EthAccountEvent.UPDATED_STATE, this.onEthAccountStateChange);
    await this.ethAccount.init();
  }

  private onEthAccountStateChange = () => {
    if (!this.locked) {
      this.refreshValues();
    }
  };

  private onRollupStatusChange = () => {
    if (!this.locked) {
      this.refreshValues();
    }
  };

  private onProviderStateChange = (state?: ProviderState) => {
    if (this.locked) return;

    if (!this.ethAccount.isSameAddress(state?.account)) {
      this.renewEthAccount();
    }
    this.unsubscribeToDepositGasCost();
    this.subscribeToDepositGasCost();
  };

  private async subscribeToDepositGasCost() {
    if (this.depositGasCostSubscriber !== undefined) {
      debug('Already subscribed to deposit gas cost changes.');
      return;
    }

    const checkDepositGasCost = async () => {
      if (this.locked) return;

      const isActive = this.accountUtils.isActiveProvider(this.provider);
      const depositGasCost = isActive
        ? ((await this.rollup.getDepositGasCost(this.asset.id, 1n, this.provider!)) * 110n) / 100n // * 1.1)
        : 0n;
      if (depositGasCost !== this.depositGasCost) {
        this.depositGasCost = depositGasCost;
        this.refreshValues();
      }
    };

    await checkDepositGasCost();
    this.depositGasCostSubscriber = window.setInterval(checkDepositGasCost, this.depositGasCostInterval);
  }

  private unsubscribeToDepositGasCost() {
    clearInterval(this.depositGasCostSubscriber);
    this.depositGasCostSubscriber = undefined;
  }

  private updateFormStatus(status: FormStatus) {
    this.formStatus = status;
    this.emit(AccountFormEvent.UPDATED_FORM_STATUS, status);
  }

  private updateFormValues(changes: Partial<ShieldFormValues>) {
    this.values = mergeValues(this.values, changes);
    this.emit(AccountFormEvent.UPDATED_FORM_VALUES, this.values);
  }
}
