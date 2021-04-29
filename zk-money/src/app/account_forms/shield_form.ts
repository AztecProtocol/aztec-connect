import {
  AccountId,
  AssetId,
  EthAddress,
  JoinSplitProofOutput,
  PermitArgs,
  SettlementTime,
  TxType,
  WalletSdk,
  Web3Signer,
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
import { RollupService, RollupServiceEvent, RollupStatus, TxFee } from '../rollup_service';
import { fromBaseUnits, max, min, toBaseUnits } from '../units';
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

interface TxFeesValue extends FormValue {
  value: TxFee[];
}

interface TxSpeedInput extends IntValue {
  value: SettlementTime;
}

export interface ShieldFormValues {
  amount: StrInput;
  maxAmount: BigIntValue;
  gasCost: BigIntValue;
  fees: TxFeesValue;
  speed: TxSpeedInput;
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
  fees: {
    value: [],
  },
  speed: {
    value: SettlementTime.SLOW,
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
    this.values.fees = { value: this.rollup.getTxFees(this.asset.id, TxType.DEPOSIT) };
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

  private get requireGas() {
    return this.asset.id === AssetId.ETH;
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
    if (this.requireGas) {
      await this.updateGasPrice(this.coreProvider);
    }
    await this.ethAccount.refreshPublicBalance(false);
    await this.ethAccount.refreshPendingBalance(false);
    await this.onPublicBalanceChange();
    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
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
    const { ethAddress } = ethAccount.state;
    this.isContract = ethAddress ? await this.sdk.isContract(ethAddress) : false;
    await this.ethAccount.refreshPublicBalance(false);
    await this.ethAccount.refreshPendingBalance(false);
    await this.onPublicBalanceChange();
    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
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

    const { publicBalance, pendingBalance } = ethAccountState;
    const fees = this.rollup.getTxFees(this.asset.id, TxType.DEPOSIT);
    const speed = (changes.speed || this.values.speed).value;
    const fee = fees[speed].fee;
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
      fees: { value: fees },
      ...changes,
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

    return toUpdate;
  }

  private async validateValues() {
    const form = { ...this.values };

    if (!form.confirmed.value) {
      form.confirmed = withError(form.confirmed, 'Please confirm that you understand the risk.');
    }

    const fee = form.fees.value[form.speed.value].fee;
    if (this.status === ShieldStatus.VALIDATE) {
      // This error won't be displayed in the form but should trigger a "Session Expired" error in the confirm step.
      const currentFee = this.rollup.getFee(this.asset.id, TxType.DEPOSIT, form.speed.value);
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

    const { provider } = this.ethAccount;
    const amount = toBaseUnits(form.amount.value, this.asset.decimals);
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
        this.requireGas && toBeDeposited > 0n
          ? await this.rollup.getDepositGas(this.asset.id, toBeDeposited, provider!)
          : 0n;
      const approveProofGas =
        this.requireGas && (await this.sdk.isContract(ethAddress))
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
    const fee = form.fees.value[form.speed.value].fee;
    const publicInput = amount + fee;
    const ethAddress = this.ethAccount!.state.ethAddress!;
    const pendingBalance = await this.accountUtils.getPendingBalance(asset.id, ethAddress);
    const toBeDeposited = max(publicInput - pendingBalance, 0n);

    if (toBeDeposited) {
      this.proceed(ShieldStatus.DEPOSIT);

      let permitArgs: PermitArgs | undefined;
      const allowance =
        asset.id !== AssetId.ETH ? await this.sdk.getPublicAllowance(asset.id, ethAddress) : toBeDeposited;
      if (allowance < toBeDeposited) {
        this.prompt(`Please approve a deposit of ${fromBaseUnits(toBeDeposited, asset.decimals)} ${asset.symbol}.`);
        try {
          if (this.sdk.getAssetInfo(asset.id).permitSupport) {
            const expireIn = BigInt(300); // seconds
            const deadline = BigInt(Math.floor(Date.now() / 1000)) + expireIn;
            const permitData = await this.sdk.createPermitData(asset.id, ethAddress, toBeDeposited, deadline);
            const web3Provider = new Web3Provider(this.ethAccount.provider!.ethereumProvider);
            const signer = new Web3Signer(web3Provider);
            const signature = await signer.signTypedData(permitData, ethAddress);
            permitArgs = { signature, deadline, approvalAmount: toBeDeposited };
          } else {
            const { rollupContractAddress } = this.sdk.getLocalStatus();
            await (this.sdk as any).blockchain
              .getAsset(asset.id)
              .approve(toBeDeposited, ethAddress, rollupContractAddress, this.ethAccount.provider!.ethereumProvider);
            this.prompt('Awaiting transaction confirmation...');
            await this.confirmApproveDeposit(asset.id, toBeDeposited, ethAddress);
          }
        } catch (e) {
          debug(e);
          return this.abort('Deposit approval denied.');
        }
      }

      try {
        this.prompt(
          `Please make a deposit of ${fromBaseUnits(toBeDeposited, asset.decimals)} ${asset.symbol} from your wallet.`,
        );

        await this.sdk.depositFundsToContract(
          asset.id,
          ethAddress,
          toBeDeposited,
          permitArgs,
          this.ethAccount.provider!.ethereumProvider,
        );
      } catch (e) {
        debug(e);
        return this.abort('Failed to deposit from your wallet.');
      }

      this.prompt('Awaiting transaction confirmation...');

      try {
        await this.accountUtils.confirmPendingBalance(asset.id, ethAddress, publicInput);
        await this.ethAccount.refreshPendingBalance(true);
      } catch (e) {
        return this.abort(e.message);
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
        return this.abort(e.message);
      }

      const isContract = await this.sdk.isContract(ethAddress);
      const signingData = this.proofOutput!.signingData!;
      let validSignature = false;
      if (!isContract) {
        this.prompt('Please sign the proof data in your wallet.');
        try {
          const web3Provider = new Web3Provider(this.ethAccount.provider!.ethereumProvider);
          const signer = new Web3Signer(web3Provider);
          await this.proofOutput!.ethSign(signer, ethAddress);
          const signature = this.proofOutput!.depositSignature!;
          validSignature = signer.validateSignature(ethAddress, signature, signingData);
        } catch (e) {
          debug(e);
          return this.abort('Failed to sign the proof.');
        }
      }
      if (!validSignature && !(await this.sdk.isProofApproved(ethAddress, signingData))) {
        this.prompt('Please approve the proof data in your wallet.');
        try {
          await this.sdk.approveProof(ethAddress, signingData, this.ethAccount.provider!.ethereumProvider);
        } catch (e) {
          debug(e);
          return this.abort('Failed to approve the proof.');
        }

        this.prompt('Awaiting transaction confirmation...');
        try {
          await this.confirmApproveProof(ethAddress, signingData);
        } catch (e) {
          return this.abort(e.message);
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

      await this.ethAccount.refreshPendingBalance(true);
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
    const fee = this.values.fees.value[this.values.speed.value].fee;
    if (pendingBalance > fee) {
      amount = pendingBalance - fee;
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

  private onPublicBalanceChange = async () => {
    if (this.locked) return;

    await this.refreshGasCost();
    this.refreshValues();
    this.autofillAmountInput();
  };

  private onRollupStatusChange = (status: RollupStatus, prevStatus: RollupStatus) => {
    if (this.locked) return;

    if (!isEqual(status.txFees, prevStatus.txFees)) {
      this.refreshValues();
    }
  };

  private async refreshGasCost() {
    const { state, provider } = this.ethAccount;
    const { ethAddress, publicBalance } = state;
    let gasCost = { deposit: 0n, approveProof: 0n };
    if (this.requireGas && this.ethAccount.active && publicBalance) {
      gasCost = {
        deposit: await this.rollup.getDepositGas(this.asset.id, 1n, provider!),
        approveProof: this.isContract ? await this.rollup.getApproveProofGas(provider!) : 0n,
      };
    }
    this.accountGasCost = { ...gasCost, ethAddress };
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

  private async confirmApproveDeposit(
    assetId: AssetId,
    amount: bigint,
    account: EthAddress,
    pollInterval = (this.requiredNetwork.network === 'ganache' ? 1 : 10) * 1000,
    timeout = 30 * 60 * 1000,
  ) {
    const started = Date.now();
    while (true) {
      if (Date.now() - started > timeout) {
        throw new Error(`Timeout awaiting proof approval confirmation.`);
      }

      const allowance = await this.sdk.getPublicAllowance(assetId, account);
      if (allowance >= amount) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  private async confirmApproveProof(
    account: EthAddress,
    signingData: Buffer,
    pollInterval = (this.requiredNetwork.network === 'ganache' ? 1 : 10) * 1000,
    timeout = 30 * 60 * 1000,
  ) {
    const started = Date.now();
    while (true) {
      if (Date.now() - started > timeout) {
        throw new Error(`Timeout awaiting proof approval confirmation.`);
      }

      if (await this.sdk.isProofApproved(account, signingData)) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
}
