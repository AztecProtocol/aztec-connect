import {
  AccountId,
  AssetId,
  EthAddress,
  JoinSplitProofOutput,
  PermitArgs,
  SettlementTime,
  TxType,
  WalletSdk,
} from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { utils } from 'ethers';
import { EventEmitter } from 'events';
import { debounce, DebouncedFunc, isEqual } from 'lodash';
import { AssetState } from '../account_state';
import { AccountUtils } from '../account_utils';
import { isSameAlias, isValidAliasInput } from '../alias';
import { Asset, assets } from '../assets';
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
import { createSigningKeys, KeyVault } from '../key_vault';
import { Network } from '../networks';
import { Provider, ProviderEvent, ProviderStatus } from '../provider';
import { RollupService, RollupServiceEvent, RollupStatus, TxFee } from '../rollup_service';
import { fromBaseUnits, max, min, toBaseUnits, formatBaseUnits } from '../units';
import { AccountForm, AccountFormEvent } from './account_form';

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
  value: SettlementTime;
}

interface AssetStateValue extends FormValue {
  value: { asset: Asset; txAmountLimit: bigint };
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
  enableAddToBalance: BoolInput;
  addToBalance: BoolInput;
  confirmed: BoolInput;
  status: {
    value: ShieldStatus;
  };
  submit: BoolInput;
}

const initialShieldFormValues = {
  assetState: {
    value: { asset: assets[0], txAmountLimit: 0n },
  },
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
  private depositProof: {
    depositor?: EthAddress;
    proofOutput?: JoinSplitProofOutput;
    signature?: Buffer;
    validSignatue?: boolean;
  } = {};
  private destroyed = false;

  private isContract = false;
  private accountGasCost: AccountGasCost = { ethAddress: undefined, deposit: 0n, approveProof: 0n };
  private gasPrice = 0n;

  private debounceUpdateRecipient: DebouncedFunc<() => void>;

  private readonly aliasDebounceWait = 1000;

  constructor(
    accountState: { userId: AccountId; alias: string },
    private assetState: { asset: Asset; spendableBalance: bigint },
    private provider: Provider | undefined,
    private ethAccount: EthAccount,
    private readonly keyVault: KeyVault,
    private readonly sdk: WalletSdk,
    private readonly db: Database,
    private readonly coreProvider: Provider,
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
    this.debounceUpdateRecipient = debounce(this.updateRecipientStatus, this.aliasDebounceWait);
    this.values.recipient = { value: { input: this.alias, valid: ValueAvailability.VALID } };
    this.values.fees = { value: this.rollup.getTxFees(this.asset.id, TxType.DEPOSIT) };
    const values: Partial<ShieldFormValues> = {};
    if (amountPreselection !== undefined) {
      values.amount = {
        value: formatBaseUnits(amountPreselection, this.asset.decimals, {
          precision: this.asset.preferredFractionalDigits,
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
    this.provider?.off(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.ethAccount.off(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.off(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
    this.debounceUpdateRecipient.cancel();
  }

  async init() {
    this.rollup.on(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    if (this.requireGas) {
      await this.updateGasPrice(this.coreProvider);
    }
    this.provider?.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    await this.ethAccount.refreshPublicBalance(false);
    await this.ethAccount.refreshPendingBalance(false);
    await this.onPublicBalanceChange();
    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
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
      assetState: { value: { ...this.assetState, txAmountLimit: this.txAmountLimit } },
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

    const { preferredFractionalDigits } = this.asset;
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

    const recipient = form.recipient.value.input;
    if (!isSameAlias(recipient, this.alias) && !(await this.accountUtils.isValidRecipient(recipient))) {
      form.recipient = withError(form.recipient, `Cannot find a user with username '${recipient}'.`);
    }

    return form;
  }

  private async createProof(privateKey: Buffer) {
    this.updateFormValues({ status: { value: ShieldStatus.VALIDATE }, submit: clearMessage({ value: true }) });

    const validated = await this.validateValues();
    if (!isValidForm(validated)) {
      this.updateFormValues(mergeValues(validated, { status: { value: ShieldStatus.CONFIRM } }));
      return;
    }

    this.updateFormStatus(FormStatus.PROCESSING);

    try {
      await this.shield(privateKey);
      this.updateFormValues({ submit: { value: false } });
    } catch (e) {
      debug(e);
      this.updateFormValues({
        submit: withError({ value: false }, `Something went wrong. This shouldn't happen.`),
      });
    }

    this.updateFormStatus(FormStatus.LOCKED);
  }

  private async shield(privateKey?: Buffer) {
    if (!this.depositProof.depositor) {
      this.proceed(ShieldStatus.DEPOSIT);
      try {
        this.depositProof.depositor = await this.deposit();
      } catch (e) {
        return this.abort(e.message);
      }
    }

    const form = this.values;
    const hasPrivateInput = form.enableAddToBalance.value && form.addToBalance.value;
    const accountPrivateKey = hasPrivateInput ? privateKey : this.keyVault.accountPrivateKey;
    const senderId = hasPrivateInput ? this.userId : new AccountId(this.keyVault.accountPublicKey, 0);

    if (!accountPrivateKey) {
      this.updateFormStatus(FormStatus.LOCKED);
      this.updateFormValues({ status: { value: ShieldStatus.GENERATE_KEY } });
      await this.requestSigningKey();
      return;
    }

    await this.accountUtils.addUser(accountPrivateKey, senderId.nonce);

    const asset = this.asset;
    const recipient = form.recipient.value.input;
    const outputNoteOwner = recipient === this.alias ? this.userId : (await this.accountUtils.getAccountId(recipient))!;
    const amount = toBaseUnits(form.amount.value, asset.decimals);
    const fee = form.fees.value[form.speed.value].fee;
    const publicInput = amount + fee;
    const { depositor } = this.depositProof;

    if (this.status <= ShieldStatus.CREATE_PROOF) {
      this.proceed(ShieldStatus.CREATE_PROOF);

      const signer = this.sdk.createSchnorrSigner(accountPrivateKey);
      const privateInput = hasPrivateInput ? await this.sdk.getMaxSpendableValue(asset.id, senderId) : 0n;
      const toBeShielded = amount + privateInput;
      const [recipientPrivateOutput, senderPrivateOutput] = senderId.equals(outputNoteOwner)
        ? [0n, toBeShielded]
        : [toBeShielded, 0n];
      this.depositProof.proofOutput = await this.sdk.createJoinSplitProof(
        asset.id,
        senderId,
        publicInput,
        0n,
        privateInput,
        recipientPrivateOutput,
        senderPrivateOutput,
        signer,
        outputNoteOwner,
        depositor,
      );
    }

    const proofOutput = this.depositProof.proofOutput!;
    if (this.status <= ShieldStatus.APPROVE_PROOF) {
      this.proceed(ShieldStatus.APPROVE_PROOF);

      try {
        await this.ensureNetworkAndAccount(depositor);
      } catch (e) {
        return this.abort(e.message);
      }

      const isContract = await this.sdk.isContract(depositor);
      const signingData = proofOutput.tx.txHash.toBuffer();
      if (!isContract && !this.depositProof.signature) {
        const msgHash = Buffer.from(utils.arrayify(utils.keccak256(signingData))).toString('hex');
        this.prompt(
          `Please sign the following proof data in your wallet: 0x${msgHash.slice(0, 8)}...${msgHash.slice(-4)}`,
        );
        try {
          this.depositProof.signature = await this.sdk.signProof(
            proofOutput,
            depositor,
            this.ethAccount.provider!.ethereumProvider,
          );
          this.depositProof.validSignatue = this.sdk.validateSignature(
            depositor,
            this.depositProof.signature,
            signingData,
          );
        } catch (e) {
          debug(e);
          return this.abort('Failed to sign the proof.');
        }
      }
      if (!this.depositProof.validSignatue && !(await this.sdk.isProofApproved(depositor, signingData))) {
        this.prompt('Please approve the proof data in your wallet.');
        try {
          await this.sdk.approveProof(depositor, signingData, this.ethAccount.provider!.ethereumProvider);
        } catch (e) {
          debug(e);
          return this.abort('Failed to approve the proof.');
        }

        this.prompt('Awaiting transaction confirmation...');
        try {
          await this.confirmApproveProof(depositor, signingData);
        } catch (e) {
          return this.abort(e.message);
        }
      }
    }

    if (this.status <= ShieldStatus.SEND_PROOF) {
      this.proceed(ShieldStatus.SEND_PROOF);

      try {
        await this.sdk.sendProof(proofOutput, this.depositProof.signature);
      } catch (e) {
        debug(e);
        return this.abort(`Failed to send the proof: ${e.message}`);
      }

      if (!senderId.equals(this.userId)) {
        await this.db.addMigratingTx({
          ...proofOutput.tx,
          userId: outputNoteOwner,
        });
      }

      await this.ethAccount.refreshPendingBalance(true);
    }

    if (!senderId.equals(this.userId)) {
      await this.accountUtils.removeUser(senderId);
    }

    this.proceed(ShieldStatus.DONE);
  }

  private async deposit() {
    const form = this.values;
    const asset = this.asset;
    const amount = toBaseUnits(form.amount.value, asset.decimals);
    const fee = form.fees.value[form.speed.value].fee;
    const publicInput = amount + fee;
    const depositor = this.ethAccount!.state.ethAddress!;
    const pendingBalance = await this.accountUtils.getPendingBalance(asset.id, depositor);
    const toBeDeposited = max(publicInput - pendingBalance, 0n);

    if (toBeDeposited) {
      let permitArgs: PermitArgs | undefined;
      const allowance =
        asset.id !== AssetId.ETH ? await this.sdk.getPublicAllowance(asset.id, depositor) : toBeDeposited;
      if (allowance < toBeDeposited) {
        this.prompt(`Please approve a deposit of ${fromBaseUnits(toBeDeposited, asset.decimals)} ${asset.symbol}.`);
        try {
          if (this.sdk.getAssetInfo(asset.id).permitSupport) {
            const expireIn = BigInt(300); // seconds
            const deadline = BigInt(Math.floor(Date.now() / 1000)) + expireIn;
            permitArgs = await this.sdk.createPermitArgs(
              asset.id,
              depositor,
              toBeDeposited,
              deadline,
              this.ethAccount.provider!.ethereumProvider,
            );
          } else {
            const { rollupContractAddress } = this.sdk.getLocalStatus();
            await (this.sdk as any).blockchain
              .getAsset(asset.id)
              .approve(toBeDeposited, depositor, rollupContractAddress, this.ethAccount.provider!.ethereumProvider);
            this.prompt('Awaiting transaction confirmation...');
            await this.confirmApproveDeposit(asset.id, toBeDeposited, depositor);
          }
        } catch (e) {
          debug(e);
          throw new Error('Deposit approval denied.');
        }
      }

      try {
        this.prompt(
          `Please make a deposit of ${fromBaseUnits(toBeDeposited, asset.decimals)} ${asset.symbol} from your wallet.`,
        );

        await this.sdk.depositFundsToContract(
          asset.id,
          depositor,
          toBeDeposited,
          undefined,
          permitArgs,
          this.ethAccount.provider!.ethereumProvider,
        );
      } catch (e) {
        debug(e);
        throw new Error('Failed to deposit from your wallet.');
      }

      this.prompt('Awaiting transaction confirmation...');

      await this.accountUtils.confirmPendingBalance(asset.id, depositor, publicInput);
      await this.ethAccount.refreshPendingBalance(true);
    }

    return depositor;
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
          `Please switch your wallet's account back to ${account.toString().slice(0, 6)}...${account
            .toString()
            .slice(-4)}.`,
        );
      } else {
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
          value: formatBaseUnits(amount, this.asset.decimals, { precision: this.asset.preferredFractionalDigits }),
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

  private onProviderStateChange = async () => {
    if (this.status === ShieldStatus.GENERATE_KEY) {
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
        `Please switch your wallet's account to ${signerAddress
          .toString()
          .slice(0, 6)}...${signerAddress.toString().slice(-4)}.`,
      );
      return;
    }

    this.prompt('Please sign the message in your wallet to generate your Aztec Spending Key.');

    try {
      const { privateKey } = await createSigningKeys(provider, this.sdk);
      if (!this.destroyed && this.status === ShieldStatus.GENERATE_KEY && provider === this.provider) {
        await this.createProof(privateKey);
      }
    } catch (e) {
      if (this.status === ShieldStatus.GENERATE_KEY && provider === this.provider) {
        this.updateFormValues({ status: { value: ShieldStatus.CONFIRM }, submit: clearMessage({ value: true }) });
      }
    }
  }

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
    this.gasPrice = BigInt((await new Web3Provider(provider.ethereumProvider).getGasPrice()).toString());
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
      if (this.destroyed) {
        throw new Error('Session destroyed.');
      }
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
      if (this.destroyed) {
        throw new Error('Session destroyed.');
      }
    }
  }
}
