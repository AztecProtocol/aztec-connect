import {
  AccountId,
  AssetId,
  EthAddress,
  JoinSplitProofOutput,
  PermitArgs,
  TxHash,
  TxType,
  WalletSdk,
} from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { debounce, DebouncedFunc, isEqual } from 'lodash';
import { AccountState, AssetState } from '../account_state';
import { AccountUtils } from '../account_utils';
import { isSameAlias, isValidAliasInput } from '../alias';
import { Asset } from '../assets';
import { Database } from '../database';
import { EthAccount, EthAccountEvent, EthAccountState } from '../eth_account';
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
import { Provider, ProviderStatus } from '../provider';
import { RollupService, RollupServiceEvent, RollupStatus } from '../rollup_service';
import { fromBaseUnits, max, min, toBaseUnits } from '../units';
import { Web3Signer } from '../wallet_providers';
import { AccountForm, AccountFormEvent } from './account_form';

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
  gasCost: BigIntValue;
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
  gasCost: {
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

interface AccountGasCost {
  ethAddress?: EthAddress;
  deposit: bigint;
  approveProof: bigint;
}

export class ShieldForm extends EventEmitter implements AccountForm {
  private readonly userId: AccountId;
  private readonly alias: string;
  private readonly asset: Asset;

  private values: ShieldFormValues = initialShieldFormValues;
  private formStatus = FormStatus.ACTIVE;
  private proofOutput?: JoinSplitProofOutput;
  private destroyed = false;

  private isContract = false;
  private accountGasCost: AccountGasCost = { ethAddress: undefined, deposit: 0n, approveProof: 0n };
  private gasPrice = 0n;
  private minFee = 0n;

  private debounceUpdateRecipient: DebouncedFunc<() => void>;

  private readonly aliasDebounceWait = 1000;

  constructor(
    private accountState: AccountState,
    private assetState: AssetState,
    private sdk: WalletSdk,
    private db: Database,
    private coreProvider: Provider,
    private ethAccount: EthAccount,
    private rollup: RollupService,
    private accountUtils: AccountUtils,
    private readonly requiredNetwork: Network,
    private readonly txAmountLimit: bigint,
  ) {
    super();
    this.userId = accountState.userId;
    this.alias = accountState.alias;
    this.asset = assetState.asset;
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

    this.destroyed = true;
    this.removeAllListeners();
    this.rollup.off(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    this.ethAccount.off(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.off(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
    this.debounceUpdateRecipient.cancel();
  }

  async init() {
    this.rollup.on(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
    await this.updateGasPrice(this.coreProvider);
    this.refreshValues();
    this.autofillAmountInput();
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

  changeProvider() {}

  async changeEthAccount(ethAccount: EthAccount) {
    if (this.processing) {
      debug('Cannot change ethAccount while a form is being processed.');
      return;
    }

    this.ethAccount.off(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.off(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
    this.clearAmountInput();
    this.ethAccount = ethAccount;
    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
    const { ethAddress } = ethAccount.state;
    this.isContract = ethAddress ? await this.sdk.isContract(ethAddress) : false;
    await this.refreshGasCost();
    this.autofillAmountInput();
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
    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
  }

  async lock() {
    this.updateFormValues({ submit: { value: true } });

    this.updateFormStatus(FormStatus.LOCKED);

    const validated = await this.validateValues();
    if (isValidForm(validated)) {
      this.ethAccount.off(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
      this.ethAccount.off(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
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
    const gasCost = ((this.accountGasCost.deposit + this.accountGasCost.approveProof) * this.gasPrice * 110n) / 100n; // * 1.1
    const maxAmount = min(
      max(0n, publicBalance + pendingBalance - fee - gasCost, pendingBalance - fee),
      this.txAmountLimit,
    );
    const recipient = this.values.recipient.value.input;

    const toUpdate = this.validateChanges({
      maxAmount: { value: maxAmount },
      gasCost: { value: gasCost },
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

    const amountInput = changes.amount || this.values.amount;
    const { provider, isCorrectNetwork } = this.ethAccount;
    if (!provider || provider.status === ProviderStatus.DESTROYED) {
      toUpdate.amount = withError(amountInput, 'Please connect a wallet.');
    } else if (!isCorrectNetwork) {
      toUpdate.ethAccount = withError(changes.ethAccount!, 'Wrong network.');
      toUpdate.amount = withError(
        amountInput,
        `Please switch your wallet's network to ${this.requiredNetwork.network}.`,
      );
    } else if (!changes.amount) {
      toUpdate.amount = clearMessage(amountInput);
    }

    const amountValue = toBaseUnits(amountInput.value, this.asset.decimals);
    if (amountValue > this.txAmountLimit && !toUpdate.amount?.message) {
      toUpdate.amount = withError(
        amountInput,
        `For security, amount is capped at ${fromBaseUnits(this.txAmountLimit, this.asset.decimals)} ${
          this.asset.symbol
        }.`,
      );
    }

    if (changes.maxAmount && !toUpdate.amount?.message) {
      const { maxAmount, gasCost } = changes;
      if (amountValue > maxAmount.value + gasCost!.value) {
        toUpdate.amount = withError(amountInput, `Insufficient ${this.asset.symbol} Balance.`);
      } else if (amountValue > maxAmount.value) {
        toUpdate.amount = withError(
          amountInput,
          `Insufficient ${this.asset.symbol} Balance. Please reserve at least ${fromBaseUnits(
            gasCost!.value,
            this.asset.decimals,
          )} ${this.asset.symbol} for gas cost.`,
        );
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

    const amount = toBaseUnits(form.amount.value, this.asset.decimals);
    const { provider } = this.ethAccount;
    if (!this.ethAccount.active) {
      if (!provider) {
        form.amount = withError(form.amount, 'Please connect a wallet.');
      } else {
        form.amount = withError(form.amount, `Please switch your wallet's network to ${this.requiredNetwork.network}.`);
      }
    } else if (!amount) {
      form.amount = withError(form.amount, 'Amount must be greater than 0.');
    } else {
      const ethAddress = this.ethAccount!.state.ethAddress!;
      const pendingBalance = await this.ethAccount.refreshPendingBalance();
      const publicBalance = await this.ethAccount.refreshPublicBalance();
      const toBeDeposited = amount + fee - pendingBalance;
      const depositGas =
        toBeDeposited > 0n ? await this.rollup.getDepositGas(this.asset.id, toBeDeposited, provider!) : 0n;
      const approveProofGas = (await this.sdk.isContract(ethAddress))
        ? await this.rollup.getApproveProofGas(provider!)
        : 0n;
      const totalGas = depositGas + approveProofGas;
      if (totalGas) {
        await this.updateGasPrice(provider!);
      }
      const requiredPublicFund = max(0n, toBeDeposited + totalGas * this.gasPrice);
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
    const form = this.values;
    const asset = this.asset;
    const recipient = form.recipient.value.input;
    const outputNoteOwner = (await this.accountUtils.getAccountId(recipient))!;
    const { nonce, publicKey, privateKey } = this.sdk.getUserData(this.userId);
    const senderId = this.accountState.settled ? this.userId : new AccountId(publicKey, nonce - 1);
    const amount = toBaseUnits(form.amount.value, asset.decimals);
    const fee = toBaseUnits(form.fee.value, asset.decimals);
    const publicInput = amount + fee;
    const ethAddress = this.ethAccount!.state.ethAddress!;
    const pendingBalance = await this.accountUtils.getPendingBalance(asset.id, ethAddress);
    const toBeDeposited = max(publicInput - pendingBalance, 0n);

    if (toBeDeposited) {
      this.proceed(ShieldStatus.DEPOSIT);

      this.prompt(
        `Please make a deposit of ${fromBaseUnits(toBeDeposited, asset.decimals)} ${asset.symbol} from your wallet.`,
      );

      try {
        await this.withUserProvider(async () => {
          const txHash = await this.depositPendingFunds(asset.id, ethAddress, toBeDeposited);
          this.prompt('Awaiting transaction confirmation...');
          await this.getTransactionReceipt(txHash);
        });
      } catch (e) {
        debug(e);
        return this.abort('Failed to deposit from your wallet.');
      }
    }

    if (this.status <= ShieldStatus.CREATE_PROOF) {
      this.proceed(ShieldStatus.CREATE_PROOF);

      const signer = this.sdk.createSchnorrSigner(privateKey);
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
      this.proceed(ShieldStatus.APPROVE_PROOF);

      const inputOwner = new EthAddress(this.proofOutput!.proofData.slice(10 * 32, 10 * 32 + 32));
      try {
        await this.ensureNetworkAndAccount(inputOwner);
      } catch (e) {
        return this.abort('Wallet disconnected.');
      }

      const isContract = await this.sdk.isContract(ethAddress);
      if (isContract) {
        this.prompt('Please approve the proof data in your wallet.');
        try {
          await this.withUserProvider(async () => {
            const txHash = await this.approveProof(ethAddress, this.proofOutput!.signingData!);
            this.prompt('Awaiting transaction confirmation...');
            await this.getTransactionReceipt(txHash);
          });
        } catch (e) {
          debug(e);
          return this.abort('Failed to approve the proof.');
        }
      } else {
        this.prompt('Please sign the proof data in your wallet.');

        try {
          const signer = new Web3Signer(this.ethAccount.provider!.ethereumProvider);
          await this.proofOutput!.ethSign(signer as any, ethAddress);
        } catch (e) {
          debug(e);
          return this.abort('Failed to sign the proof.');
        }
      }
    }

    if (this.status <= ShieldStatus.SEND_PROOF) {
      this.proceed(ShieldStatus.SEND_PROOF);

      try {
        await this.sdk.sendProof(this.proofOutput!);
      } catch (e) {
        debug(e);
        return this.abort('Failed to send the proof.');
      }

      if (!senderId.equals(this.userId)) {
        await this.db.addMigratingTx(senderId, {
          ...this.proofOutput!.tx,
          userId: outputNoteOwner,
          ownedByUser: false,
        });
      }
    }

    this.proceed(ShieldStatus.DONE);
  }

  private async ensureNetworkAndAccount(account: EthAddress) {
    const { provider } = this.ethAccount;
    let currentAccount = provider?.account;
    let isSameAccount = currentAccount?.equals(account);
    let isSameNetwork = provider?.network?.chainId === this.requiredNetwork.chainId;

    while (!isSameAccount || !isSameNetwork) {
      if (this.destroyed) {
        throw new Error('Form destroyed.');
      }

      if (!currentAccount) {
        throw new Error('Wallet disconnected.');
      }

      if (!isSameAccount) {
        this.prompt(
          `Please switch your wallet's account back to 0x${account.toString().slice(0, 4)}...${account
            .toString()
            .slice(-4)}.`,
        );
      } else if (!isSameNetwork) {
        this.prompt(`Please switch your wallet's network to ${this.requiredNetwork.network}...`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      currentAccount = provider?.account;
      isSameAccount = currentAccount?.equals(account);
      isSameNetwork = provider?.chainId === this.requiredNetwork.chainId;
    }
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

  private clearAmountInput() {
    this.updateFormValues({ amount: { value: '' } });
  }

  private autofillAmountInput() {
    let amount = 0n;
    const { pendingBalance } = this.ethAccount.state;
    if (pendingBalance) {
      amount = pendingBalance - toBaseUnits(this.values.fee.value, this.asset.decimals);
    } else {
      amount = this.values.maxAmount.value;
    }
    if (amount && !this.values.amount.value) {
      this.updateFormValues({ amount: { value: fromBaseUnits(amount, this.asset.decimals) } });
    }
  }

  private onPendingBalanceChange = () => {
    if (this.locked) return;

    this.refreshValues();
    this.autofillAmountInput();
  };

  private onPublicBalanceChange = () => {
    if (this.locked) return;

    this.refreshGasCost();
  };

  private onRollupStatusChange = (status: RollupStatus, prevStatus: RollupStatus) => {
    if (this.locked) return;

    if (!isEqual(status.txFees, prevStatus.txFees)) {
      this.refreshValues();
    }
  };

  private async refreshGasCost() {
    const zeroGasCost = { ethAddress: undefined, deposit: 0n, approveProof: 0n };
    if (!this.ethAccount.active) {
      this.updateAccountGasCost(zeroGasCost);
      return;
    }

    const { state, provider } = this.ethAccount;
    const { ethAddress, publicBalance } = state;
    const gasCost = publicBalance
      ? {
          deposit: await this.rollup.getDepositGas(this.asset.id, 1n, provider!),
          approveProof: this.isContract ? await this.rollup.getApproveProofGas(provider!) : 0n,
        }
      : zeroGasCost;
    this.updateAccountGasCost({ ...gasCost, ethAddress });
  }

  private updateAccountGasCost(accountGasCost: AccountGasCost) {
    this.accountGasCost = accountGasCost;
    if (!this.locked) {
      this.refreshValues();
    }
  }

  private async updateGasPrice(provider: Provider) {
    this.gasPrice = BigInt(await new Web3Provider(provider.ethereumProvider).getGasPrice());
  }

  private updateFormStatus(status: FormStatus) {
    this.formStatus = status;
    this.emit(AccountFormEvent.UPDATED_FORM_STATUS, status);
  }

  private updateFormValues(changes: Partial<ShieldFormValues>) {
    this.values = mergeValues(this.values, changes);
    this.emit(AccountFormEvent.UPDATED_FORM_VALUES, this.values);
  }

  private proceed(status: ShieldStatus, message = '') {
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

  private async depositPendingFunds(
    assetId: AssetId,
    from: EthAddress,
    value: bigint,
    permitArgs?: PermitArgs,
  ): Promise<TxHash> {
    return (this.sdk as any).blockchain.depositPendingFunds(assetId, value, from, permitArgs);
  }

  private async approveProof(account: EthAddress, signingData: Buffer) {
    return (this.sdk as any).blockchain.approveProof(account, signingData);
  }

  private getTransactionReceipt(txHash: TxHash) {
    return (this.sdk as any).blockchain.getTransactionReceipt(txHash);
  }

  private async withUserProvider(action: () => any) {
    try {
      await this.sdk.setProvider(this.ethAccount.provider!.ethereumProvider);
      await action();
      await this.sdk.setProvider(this.coreProvider.ethereumProvider);
    } catch (e) {
      await this.sdk.setProvider(this.coreProvider.ethereumProvider);
      throw e;
    }
  }
}
