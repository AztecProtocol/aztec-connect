import { EthAddress, WalletSdk } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { AssetState } from '../account_state';
import { AccountUtils } from '../account_utils';
import { Asset, assets } from '../assets';
import { EthAccount, EthAccountEvent, EthAccountState } from '../eth_account';
import {
  BigIntValue,
  BoolInput,
  clearMessage,
  clearMessages,
  formatBigIntInput,
  FormStatus,
  FormValue,
  isValidForm,
  mergeValues,
  StrInput,
  withError,
  withMessage,
  withWarning,
} from '../form';
import { Network } from '../networks';
import { Provider, ProviderEvent, ProviderStatus } from '../provider';
import { RollupService } from '../rollup_service';
import { fromBaseUnits, max, min, toBaseUnits } from '../units';
import { AccountForm, AccountFormEvent } from './account_form';

const debug = createDebug('zm:deposit_form');

export enum DepositStatus {
  NADA,
  VALIDATE,
  DEPOSIT,
  DONE,
}

interface AssetValue extends FormValue {
  value: Asset;
}

interface EthAccountStateValue extends FormValue {
  value: EthAccountState;
}

export interface DepositFormValues {
  amount: StrInput;
  maxAmount: BigIntValue;
  minAmount: BigIntValue;
  gasCost: BigIntValue;
  asset: AssetValue;
  ethAccount: EthAccountStateValue;
  status: {
    value: DepositStatus;
  };
  submit: BoolInput;
}

const initialDepositFormValues = {
  amount: {
    value: '',
    required: true,
  },
  maxAmount: {
    value: 0n,
  },
  minAmount: {
    value: 0n,
  },
  gasCost: {
    value: 0n,
  },
  asset: {
    value: assets[0],
  },
  ethAccount: {
    value: {
      address: undefined,
      publicBalance: 0n,
      pendingBalance: 0n,
    },
  },
  status: {
    value: DepositStatus.NADA,
  },
  submit: {
    value: false,
  },
};

interface AccountGasCost {
  ethAddress?: EthAddress;
  deposit: bigint;
}

export class DepositForm extends EventEmitter implements AccountForm {
  private asset: Asset;

  private values: DepositFormValues = initialDepositFormValues;
  private formStatus = FormStatus.ACTIVE;

  private ethAccount!: EthAccount;
  private accountGasCost: AccountGasCost = { ethAddress: undefined, deposit: 0n };
  private gasPrice = 0n;

  constructor(
    asset: Asset,
    private sdk: WalletSdk,
    private coreProvider: Provider,
    private provider: Provider | undefined,
    private rollup: RollupService,
    private accountUtils: AccountUtils,
    private readonly requiredNetwork: Network,
    private readonly txAmountLimit: bigint,
    private readonly minAmount: bigint,
  ) {
    super();
    this.asset = asset;
    this.ethAccount = new EthAccount(
      provider,
      accountUtils,
      asset.id,
      this.rollup.supportedAssets[asset.id].address,
      requiredNetwork,
    );
    this.refreshValues();
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

  getValues() {
    return { ...this.values };
  }

  destroy() {
    if (this.processing) {
      throw new Error('Cannot destroy a form while it is being processed.');
    }

    this.removeAllListeners();
    this.ethAccount.destroy();
    this.provider?.off(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
  }

  async init() {
    this.provider?.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    await this.updateGasPrice(this.coreProvider);
    await this.renewEthAccount();
    this.refreshValues();
  }

  changeAssetState(assetState: AssetState) {
    if (this.processing) {
      debug('Cannot change asset state while a form is being processed.');
      return;
    }

    if (assetState.asset.id !== this.asset.id) {
      this.asset = assetState.asset;
      this.refreshValues();
    }
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

  changeValues(newValues: Partial<DepositFormValues>) {
    if (this.locked) {
      debug('Cannot change form values while it is locked.');
      return;
    }

    const changes = { ...newValues, submit: clearMessage(this.values.submit) };
    if (changes.amount) {
      changes.amount = formatBigIntInput(changes.amount);
    }

    this.refreshValues(changes);
  }

  unlock() {
    if (this.processing) {
      debug('Cannot unlock a form while it is being processed.');
      return;
    }

    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);

    this.updateFormValues({
      status: { value: DepositStatus.NADA },
      submit: { value: false },
    });
    this.updateFormStatus(FormStatus.ACTIVE);
  }

  async lock() {
    this.updateFormValues({ submit: { value: true } });

    this.updateFormStatus(FormStatus.LOCKED);
    this.updateFormValues({ status: { value: DepositStatus.VALIDATE }, submit: clearMessage(this.values.submit) });

    const validated = await this.validateValues();
    if (isValidForm(validated)) {
      this.ethAccount.off(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
      this.ethAccount.off(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
    } else {
      this.updateFormValues(validated);
      this.unlock();
    }
  }

  async submit() {
    if (!this.locked) {
      debug('Cannot submit a form before it has been validated and locked.');
      return;
    }

    this.updateFormStatus(FormStatus.PROCESSING);

    try {
      await this.deposit();
      this.updateFormValues({ submit: { value: false } });
    } catch (e) {
      this.updateFormValues({
        submit: withError({ value: false }, e.message),
      });
    }

    this.updateFormStatus(FormStatus.LOCKED);
    if (this.status !== DepositStatus.DONE) {
      this.unlock();
    }
  }

  private refreshValues(changes: Partial<DepositFormValues> = {}) {
    const ethAccountState = this.ethAccount.state;
    const { publicBalance } = ethAccountState;
    const gasCost = (this.accountGasCost.deposit * this.gasPrice * 110n) / 100n; // * 1.1
    const maxAmount = min(max(0n, publicBalance - gasCost), this.txAmountLimit);

    const toUpdate = this.validateChanges({
      asset: { value: this.asset },
      maxAmount: { value: maxAmount },
      minAmount: { value: this.minAmount },
      gasCost: { value: gasCost },
      ethAccount: { value: ethAccountState },
      ...changes,
    });

    this.updateFormValues(toUpdate);
  }

  private validateChanges(changes: Partial<DepositFormValues>) {
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
    } else {
      toUpdate.amount = clearMessage(amountInput);
    }

    const { pendingBalance } = this.ethAccount.state;
    const amountValue = toBaseUnits(amountInput.value, this.asset.decimals);
    if (pendingBalance < this.minAmount && amountInput.value && !toUpdate.amount?.message) {
      const { maxAmount, minAmount, gasCost } = changes;
      if (amountValue > this.txAmountLimit) {
        toUpdate.amount = withError(
          amountInput,
          `For security, amount is capped at ${fromBaseUnits(this.txAmountLimit, this.asset.decimals)} ${
            this.asset.symbol
          }.`,
        );
      } else if (amountValue > maxAmount!.value + gasCost!.value) {
        toUpdate.amount = withError(amountInput, `Insufficient ${this.asset.symbol} Balance.`);
      } else if (amountValue > maxAmount!.value) {
        toUpdate.amount = withError(
          amountInput,
          `Insufficient ${this.asset.symbol} Balance. Please reserve at least ${fromBaseUnits(
            gasCost!.value,
            this.asset.decimals,
          )} ${this.asset.symbol} for gas cost.`,
        );
      } else if (amountValue < minAmount!.value) {
        toUpdate.amount = withError(
          amountInput,
          `Please deposit at least ${fromBaseUnits(minAmount!.value, this.asset.decimals)} ${this.asset.symbol}.`,
        );
      }
    }

    return toUpdate;
  }

  private async validateValues() {
    const form = { ...this.values };
    if (!isValidForm(form)) {
      return form;
    }

    const pendingBalance = await this.ethAccount.refreshPendingBalance();
    if (pendingBalance < this.minAmount) {
      const amount = toBaseUnits(form.amount.value, this.asset.decimals);
      const publicBalance = await this.ethAccount.refreshPublicBalance();
      const depositGas = await this.rollup.getDepositGas(this.asset.id, amount, this.provider!);
      await this.updateGasPrice(this.provider!);
      const gasCost = depositGas * this.gasPrice;
      const requiredPublicFund = max(0n, amount + gasCost);
      if (publicBalance < requiredPublicFund) {
        form.amount = withError(
          form.amount,
          amount > publicBalance
            ? `Insufficient ${this.asset.symbol} Balance.`
            : `Insufficient ${this.asset.symbol} Balance. Please reserve at least ${fromBaseUnits(
                gasCost,
                this.asset.decimals,
              )} ${this.asset.symbol} for gas cost.`,
        );
      }
    }

    return form;
  }

  private async deposit() {
    const form = this.values;
    const asset = this.asset;
    const amount = toBaseUnits(form.amount.value, asset.decimals);
    const ethAddress = this.provider!.account!;
    const { pendingBalance } = this.ethAccount.state;

    if (amount && pendingBalance < this.minAmount) {
      this.proceed(DepositStatus.DEPOSIT);

      this.prompt(
        `Please make a deposit of ${fromBaseUnits(amount, asset.decimals)} ${asset.symbol} from your wallet.`,
      );

      try {
        await this.sdk.depositFundsToContract(
          asset.id,
          ethAddress,
          amount,
          undefined,
          undefined,
          this.ethAccount.provider!.ethereumProvider,
        );
      } catch (e) {
        debug(e);
        throw new Error('Failed to deposit from your wallet.');
      }

      this.prompt('Awaiting transaction confirmation...');
      await this.accountUtils.confirmPendingBalance(asset.id, ethAddress, pendingBalance + amount);
    }

    this.proceed(DepositStatus.DONE);
  }

  private async renewEthAccount() {
    this.ethAccount.destroy();
    this.refreshValues({ submit: clearMessage(this.values.submit) });
    this.ethAccount = new EthAccount(
      this.provider,
      this.accountUtils,
      this.asset.id,
      this.rollup.supportedAssets[this.asset.id].address,
      this.requiredNetwork,
    );
    await this.ethAccount.refreshPublicBalance();
    await this.ethAccount.refreshPendingBalance();
    this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    this.ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, this.onPublicBalanceChange);
    await this.refreshGasCost();
    this.autofillAmountInput();
  }

  private onPendingBalanceChange = (pendingBalance: bigint) => {
    if (this.locked) return;

    if (pendingBalance >= this.minAmount) {
      this.refreshValues({ amount: { value: '0' } });
    } else {
      this.refreshValues();
    }
  };

  private onPublicBalanceChange = () => {
    if (this.locked) return;

    this.refreshGasCost();
  };

  private onProviderStateChange = async () => {
    if (!this.ethAccount.isSameAccount(this.provider)) {
      this.clearAmountInput();
      await this.renewEthAccount();
    }
  };

  private clearAmountInput() {
    this.updateFormValues({ amount: { value: '' } });
  }

  private autofillAmountInput() {
    if (!this.values.amount.value) {
      const { pendingBalance } = this.ethAccount.state;
      const amount = pendingBalance >= this.minAmount ? 0n : this.minAmount;
      this.refreshValues({ amount: { value: fromBaseUnits(amount, this.asset.decimals) } });
    }
  }

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
    this.gasPrice = BigInt((await new Web3Provider(provider.ethereumProvider).getGasPrice()).toString());
  }

  private updateFormStatus(status: FormStatus) {
    this.formStatus = status;
    this.emit(AccountFormEvent.UPDATED_FORM_STATUS, status);
  }

  private updateFormValues(changes: Partial<DepositFormValues>) {
    this.values = mergeValues(this.values, changes);
    this.emit(AccountFormEvent.UPDATED_FORM_VALUES, this.values);
  }

  private proceed(status: DepositStatus, message = '') {
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
}
