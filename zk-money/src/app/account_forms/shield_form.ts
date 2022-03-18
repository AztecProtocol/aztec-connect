import { CutdownAsset } from 'app/types';
import {
  AccountId,
  AztecSdk,
  DepositController,
  EthAddress,
  GrumpkinAddress,
  RegisterController,
  TxSettlementTime,
  TxType,
  EthereumProvider,
} from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { debounce, DebouncedFunc, isEqual } from 'lodash';
import { AccountUtils } from '../account_utils';
import { isSameAlias, isValidAliasInput } from '../alias';
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
import { KeyVault } from '../key_vault';
import { Network } from '../networks';
import { Provider, ProviderStatus } from '../provider';
import { RollupService, RollupServiceEvent, RollupStatus, TxFee } from '../rollup_service';
import { formatBaseUnits, fromBaseUnits, max, min, toBaseUnits } from '../units';
import { AccountForm, AccountFormEvent } from './account_form';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';

const debug = createDebug('zm:shield_form');

export enum ShieldStatus {
  NADA,
  CONFIRM,
  VALIDATE,
  DEPOSIT,
  GENERATE_KEY,
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
  value: TxSettlementTime;
}

interface AssetStateValue extends FormValue {
  value: { asset: CutdownAsset; txAmountLimit: bigint };
}

export interface ShieldFormValues {
  assetState: AssetStateValue;
  amount: StrInput;
  maxAmount: BigIntValue;
  gasCost: BigIntValue;
  fees: TxFeesValue;
  speed: TxSpeedInput;
  ethAccount: EthAccountStateValue;
  recipient: RecipientInput;
  enableAddToBalance: BoolInput; // TODO - remove
  addToBalance: BoolInput;
  status: {
    value: ShieldStatus;
  };
  submit: BoolInput;
}

const initialShieldFormValues = {
  amount: {
    value: '0',
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
    value: TxSettlementTime.NEXT_ROLLUP,
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
  private readonly asset: CutdownAsset;
  readonly isNewAccount: boolean;

  private values: ShieldFormValues;
  private formStatus = FormStatus.ACTIVE;
  private proof?: {
    depositor: EthAddress;
    controller: DepositController | RegisterController;
    signed: boolean;
  };
  private destroyed = false;

  private isContract = false;
  private accountGasCost: AccountGasCost = { ethAddress: undefined, deposit: 0n, approveProof: 0n };
  private gasPrice = 0n;

  private debounceUpdateRecipient: DebouncedFunc<() => void>;

  private readonly aliasDebounceWait = 1000;

  constructor(
    accountState: { userId: AccountId; alias: string },
    private assetState: { asset: CutdownAsset; spendableBalance: bigint },
    private readonly newSpendingPublicKey: GrumpkinAddress | undefined,
    private provider: Provider | undefined,
    private ethAccount: EthAccount,
    private readonly keyVault: KeyVault,
    private readonly sdk: AztecSdk,
    private readonly stableEthereumProvider: EthereumProvider,
    private readonly rollup: RollupService,
    private readonly accountUtils: AccountUtils,
    private readonly requiredNetwork: Network,
    private readonly txAmountLimit: bigint,
    private readonly minAmount?: bigint,
    amountPreselection?: bigint,
  ) {
    super();
    this.userId = accountState.userId;
    this.alias = accountState.alias;
    this.asset = assetState.asset;
    this.isNewAccount = !!newSpendingPublicKey;
    this.debounceUpdateRecipient = debounce(this.updateRecipientStatus, this.aliasDebounceWait);
    this.values = {
      ...initialShieldFormValues,
      assetState: { value: { asset: assetState.asset, txAmountLimit: 0n } },
      recipient: { value: { input: this.alias, valid: ValueAvailability.VALID } },
      fees: {
        value: this.rollup.getTxFees(this.asset.id, this.isNewAccount ? TxType.ACCOUNT : TxType.DEPOSIT),
      },
    };
    this.values.recipient = { value: { input: this.alias, valid: ValueAvailability.VALID } };
    this.values.fees = {
      value: this.rollup.getTxFees(this.asset.id, this.isNewAccount ? TxType.ACCOUNT : TxType.DEPOSIT),
    };
    const values: Partial<ShieldFormValues> = {};
    if (amountPreselection !== undefined) {
      values.amount = {
        value: formatBaseUnits(amountPreselection, this.asset.decimals, {
          precision: getAssetPreferredFractionalDigits(this.asset.address),
        }),
      };
    }
    this.refreshValues(values);
  }

  get locked() {
    return this.formStatus === FormStatus.LOCKED || this.formStatus === FormStatus.PROCESSING;
  }

  get processing() {
    return this.formStatus === FormStatus.PROCESSING;
  }

  get status() {
    return this.values.status.value;
  }

  private get requireGas() {
    return this.asset.id === 0;
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
      await this.updateGasPrice(this.stableEthereumProvider);
    }
    await this.ethAccount.refreshPublicBalance(false);
    await this.ethAccount.refreshPendingBalance(false);
    await this.onPublicBalanceChange();
    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
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

    this.provider = provider;
  }

  ethAccountIsStale() {
    return !this.ethAccount?.isSameAccount(this.provider);
  }

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

    this.proof = undefined;
    this.refreshValues({
      status: { value: ShieldStatus.NADA },
      submit: clearMessage({ value: false }),
    });
    this.updateFormStatus(FormStatus.ACTIVE);
    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
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

    const status = Math.max(this.status, ShieldStatus.VALIDATE);
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
    const ethAccountState = this.ethAccount.state;

    const { publicBalance, pendingBalance } = ethAccountState;
    const speed = (changes.speed || this.values.speed).value;
    const fee = (changes.fees ?? this.values.fees).value[speed].fee;
    const gasCost = ((this.accountGasCost.deposit + this.accountGasCost.approveProof) * this.gasPrice * 110n) / 100n; // * 1.1
    const maxAmount = min(
      max(0n, publicBalance + pendingBalance - fee - gasCost, pendingBalance - fee),
      this.txAmountLimit,
    );

    const toUpdate = this.validateChanges({
      assetState: { value: { ...this.assetState, txAmountLimit: this.txAmountLimit } },
      maxAmount: { value: maxAmount },
      gasCost: { value: gasCost },
      ethAccount: { value: ethAccountState },
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

    const preferredFractionalDigits = getAssetPreferredFractionalDigits(this.asset.address);
    if (amountInput && preferredFractionalDigits !== undefined) {
      if ((amountInput.value.split('.')[1]?.length ?? 0) > preferredFractionalDigits) {
        toUpdate.amount = withError(
          amountInput,
          `Please enter no more than ${preferredFractionalDigits} decimal places.`,
        );
      }
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
    if (this.minAmount !== undefined) {
      if (amountValue < this.minAmount && !toUpdate.amount?.message) {
        toUpdate.amount = withError(
          amountInput,
          `Please shield at least ${fromBaseUnits(this.minAmount, this.asset.decimals)} ${this.asset.symbol}.`,
        );
      }
    }

    if (changes.maxAmount && !toUpdate.amount?.message) {
      const { maxAmount, gasCost } = changes;
      if (amountValue > maxAmount.value + gasCost!.value) {
        toUpdate.amount = withError(amountInput, `Insufficient ${this.asset.symbol} Balance.`);
      } else if (amountValue > maxAmount.value) {
        toUpdate.amount = withError(
          amountInput,
          `Insufficient ${this.asset.symbol} Balance. Please reserve at least ${formatBaseUnits(
            gasCost!.value,
            this.asset.decimals,
            { precision: preferredFractionalDigits },
          )} ${this.asset.symbol} for gas cost.`,
        );
      }
    }

    return toUpdate;
  }

  private async validateValues() {
    const form = { ...this.values };

    const amount = toBaseUnits(form.amount.value, this.asset.decimals);
    const fee = form.fees.value[form.speed.value].fee;
    if (this.status === ShieldStatus.VALIDATE) {
      // This error won't be displayed in the form but should trigger a "Session Expired" error in the confirm step.
      const currentFees = this.isNewAccount
        ? await this.sdk.getRegisterFees({ assetId: this.asset.id, value: amount })
        : await this.sdk.getDepositFees(this.asset.id);
      const currentFee = currentFees[form.speed.value].value;
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
        this.requireGas && toBeDeposited > 0n
          ? await this.rollup.getDepositGas(this.asset.id, toBeDeposited, provider!)
          : 0n;
      const approveProofGas =
        this.requireGas && (await this.sdk.isContract(ethAddress))
          ? await this.rollup.getApproveProofGas(provider!)
          : 0n;
      const totalGas = depositGas + approveProofGas;
      if (totalGas) {
        await this.updateGasPrice(provider?.ethereumProvider ?? this.stableEthereumProvider);
      }
      const requiredPublicFund = max(0n, toBeDeposited + totalGas * this.gasPrice);
      if (publicBalance < requiredPublicFund) {
        form.amount = withError(form.amount, `Insufficient ${this.asset.symbol} Balance.`);
      }
    }

    const recipient = form.recipient.value.input;
    if (recipient.length === 0) {
      form.recipient = withError(form.recipient, `Please write a recipient.`);
    } else if (!isSameAlias(recipient, this.alias) && !(await this.accountUtils.isValidRecipient(recipient))) {
      form.recipient = withError(form.recipient, `Cannot find a user with username '${recipient}'.`);
    }

    return form;
  }

  private async shield() {
    if (!this.proof) {
      const depositor = this.ethAccount.state.ethAddress!;
      this.proof = {
        depositor,
        controller: await this.createController(depositor),
        signed: false,
      };
    }
    if (this.status <= ShieldStatus.DEPOSIT) {
      this.proceed(ShieldStatus.DEPOSIT);
      try {
        await this.deposit();
      } catch (e) {
        return this.abort(e.message);
      }
    }

    const { controller } = this.proof;

    if (this.status <= ShieldStatus.CREATE_PROOF) {
      this.proceed(ShieldStatus.CREATE_PROOF);
      await controller.createProof();
    }

    if (this.status <= ShieldStatus.APPROVE_PROOF) {
      this.proceed(ShieldStatus.APPROVE_PROOF);

      const signingData = controller.getSigningData();
      if (signingData && !this.proof.signed && !this.isContract) {
        try {
          await this.ensureNetworkAndAccount();
        } catch (e) {
          return this.abort(e.message);
        }

        const data = signingData.toString('hex');
        this.prompt(`Please sign the following proof data in your wallet: 0x${data.slice(0, 8)}...${data.slice(-4)}`);
        try {
          await controller.sign();
        } catch (e) {
          debug(e);
          return this.abort('Failed to sign the proof.');
        }
        this.proof.signed = true;
      }

      if (
        signingData &&
        (!this.proof.signed || !controller.isSignatureValid()) &&
        !(await controller.isProofApproved())
      ) {
        try {
          await this.ensureNetworkAndAccount();
        } catch (e) {
          return this.abort(e.message);
        }

        this.prompt('Please approve the proof data in your wallet.');
        try {
          await controller.approveProof();
        } catch (e) {
          debug(e);
          return this.abort('Failed to approve the proof.');
        }

        this.prompt('Awaiting transaction confirmation...');
        try {
          await this.polling(async () => controller.isProofApproved());
        } catch (e) {
          return this.abort(e.message);
        }
      }
    }

    if (this.status <= ShieldStatus.SEND_PROOF) {
      this.proceed(ShieldStatus.SEND_PROOF);

      try {
        await controller.send();
      } catch (e) {
        debug(e);
        return this.abort(`Failed to send the proof: ${e.message}`);
      }

      await this.ethAccount.refreshPendingBalance(true);
    }

    const senderId = controller.userId;
    if (!senderId.equals(this.userId)) {
      await this.accountUtils.removeUser(senderId);
    }

    this.proceed(ShieldStatus.DONE);
  }

  private async createController(depositor: EthAddress) {
    const { accountPublicKey, accountPrivateKey } = this.keyVault;
    const senderId = new AccountId(accountPublicKey, 0);
    const form = this.values;
    const asset = this.asset;
    const depositValue = { assetId: asset.id, value: toBaseUnits(form.amount.value, asset.decimals) };
    const fee = { assetId: asset.id, value: form.fees.value[form.speed.value].fee };
    const recipient = form.recipient.value.input;
    const outputNoteOwner = recipient === this.alias ? this.userId : (await this.accountUtils.getAccountId(recipient))!;
    const signer = this.sdk.createSchnorrSigner(accountPrivateKey);
    if (this.isNewAccount) {
      await this.accountUtils.addUser(accountPrivateKey, this.userId.accountNonce);
    }
    await this.accountUtils.addUser(accountPrivateKey, senderId.accountNonce);
    return this.isNewAccount
      ? this.sdk.createRegisterController(
          senderId,
          this.alias,
          this.newSpendingPublicKey!,
          undefined,
          depositValue,
          fee,
          depositor,
          this.provider?.ethereumProvider,
        )
      : this.sdk.createDepositController(
          senderId,
          signer,
          depositValue,
          fee,
          depositor,
          outputNoteOwner,
          this.provider?.ethereumProvider,
        );
  }

  private async deposit() {
    const { controller } = this.proof!;
    const requiredFunds = await controller.getRequiredFunds();
    if (!requiredFunds) {
      return;
    }

    const asset = this.asset;
    const { permitSupport } = this.sdk.getAssetInfo(asset.id);
    if (!permitSupport) {
      const allowance = asset.id !== 0 ? await controller.getPublicAllowance() : requiredFunds;
      if (allowance < requiredFunds) {
        try {
          await this.ensureNetworkAndAccount();
        } catch (e) {
          return this.abort(e.message);
        }
        this.prompt(`Please approve a deposit of ${fromBaseUnits(requiredFunds, asset.decimals)} ${asset.symbol}.`);
        try {
          await controller.approve();
          this.prompt('Awaiting transaction confirmation...');
          await this.polling(async () => (await controller.getPublicAllowance()) >= requiredFunds);
        } catch (e) {
          debug(e);
          throw new Error('Deposit approval denied.');
        }
      }
    }

    try {
      await this.ensureNetworkAndAccount();
    } catch (e) {
      return this.abort(e.message);
    }
    try {
      this.prompt(
        `Please make a deposit of ${fromBaseUnits(requiredFunds, asset.decimals)} ${asset.symbol} from your wallet.`,
      );
      if (!permitSupport) {
        await controller.depositFundsToContract();
      } else {
        const expireIn = BigInt(300); // seconds
        const deadline = BigInt(Math.floor(Date.now() / 1000)) + expireIn;
        await controller.depositFundsToContractWithPermit(deadline);
      }
    } catch (e) {
      debug(e);
      throw new Error('Failed to deposit from your wallet.');
    }

    this.prompt('Awaiting transaction confirmation...');
    await this.polling(async () => !(await controller.getRequiredFunds()));
    await this.ethAccount.refreshPendingBalance(true);
  }

  private async ensureNetworkAndAccount() {
    const { depositor } = this.proof!;
    const { provider } = this.ethAccount;
    let currentAccount = provider?.account;
    let isSameAccount = currentAccount?.equals(depositor);
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
          `Please switch your wallet's account to ${depositor.toString().slice(0, 6)}...${depositor
            .toString()
            .slice(-4)}.`,
        );
      } else {
        this.prompt(`Please switch your wallet's network to ${this.requiredNetwork.network}...`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      currentAccount = provider?.account;
      isSameAccount = currentAccount?.equals(depositor);
      isSameNetwork = provider?.chainId === this.requiredNetwork.chainId;
    }
  }

  private updateRecipientStatus = async () => {
    const recipientInput = this.values.recipient.value.input;
    const valid = isSameAlias(recipientInput, this.alias) || (await this.accountUtils.isValidRecipient(recipientInput));
    if (recipientInput === this.values.recipient.value.input) {
      this.updateFormValues({
        recipient: {
          value: { input: recipientInput, valid: valid ? ValueAvailability.VALID : ValueAvailability.INVALID },
        },
      });
    }
  };

  private clearAmountInput() {
    if (this.locked) return;

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
      this.updateFormValues({
        amount: {
          value: formatBaseUnits(amount, this.asset.decimals, {
            precision: getAssetPreferredFractionalDigits(this.asset.address),
            floor: true,
          }),
        },
      });
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

  private async updateGasPrice(ethereumProvider: EthereumProvider) {
    this.gasPrice = BigInt((await new Web3Provider(ethereumProvider).getGasPrice()).toString());
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

  private async polling(fn: () => Promise<boolean>) {
    const pollInterval = (this.requiredNetwork.network === 'ganache' ? 1 : 10) * 1000;
    const timeout = 30 * 60 * 1000;
    const started = Date.now();
    while (true) {
      if (Date.now() - started > timeout) {
        throw new Error(`Timeout awaiting proof approval confirmation.`);
      }

      if (await fn()) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      if (this.destroyed) {
        throw new Error('Session destroyed.');
      }
    }
  }
}
