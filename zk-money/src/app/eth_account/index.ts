import { AssetId, EthAddress, WalletSdk } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { AccountUtils } from '../account_utils';
import { Network } from '../networks';
import { Provider } from '../provider';

const debug = createDebug('zm:eth_account');

export enum EthAccountEvent {
  UPDATED_PUBLIC_BALANCE = 'UPDATED_PUBLIC_BALANCE',
  UPDATED_PENDING_BALANCE = 'UPDATED_PENDING_BALANCE',
}

export interface EthAccountState {
  ethAddress?: EthAddress;
  network?: Network;
  publicBalance: bigint;
  pendingBalance: bigint;
}

type Subscriber = (...args: any) => void;

export interface EthAccount {
  on(event: EthAccountEvent.UPDATED_PUBLIC_BALANCE, listener: (publicBalance: bigint) => void): this;
  on(event: EthAccountEvent.UPDATED_PENDING_BALANCE, listener: (pendingBalance: bigint) => void): this;
}

export class EthAccount {
  private readonly address?: EthAddress;
  private readonly network?: Network;
  private web3Provider?: Web3Provider;
  private publicBalance = {
    value: 0n,
    lastSynced: 0,
  };
  private pendingBalance = {
    value: 0n,
    lastSynced: 0,
  };

  private subscribers: { [key in EthAccountEvent]: Subscriber[] } = {
    [EthAccountEvent.UPDATED_PUBLIC_BALANCE]: [],
    [EthAccountEvent.UPDATED_PENDING_BALANCE]: [],
  };

  private publicBalanceSubscriber?: number;
  private pendingBalanceSubscriber?: number;

  private readonly publicBalanceInterval = 15 * 1000;
  private readonly pendingBalanceInterval = 60 * 1000;

  constructor(
    public readonly provider: Provider | undefined,
    private sdk: WalletSdk,
    private accountUtils: AccountUtils,
    private assetId: AssetId,
    private requiredNetwork: Network,
  ) {
    this.address = provider?.account;
    this.network = provider?.network;
    if (this.isCorrectNetwork) {
      this.web3Provider = new Web3Provider(provider!.ethereumProvider);
    }
  }

  get isCorrectNetwork() {
    return this.provider?.network?.chainId === this.requiredNetwork.chainId;
  }

  get state(): EthAccountState {
    return {
      ethAddress: this.address,
      network: this.network,
      publicBalance: this.publicBalance.value,
      pendingBalance: this.pendingBalance.value,
    };
  }

  get outdated() {
    return !this.isSameAccount(this.provider);
  }

  get active() {
    return !this.outdated && this.accountUtils.isActiveProvider(this.provider);
  }

  isSameAccount(provider?: Provider) {
    const ethAddress = provider?.account;
    const network = provider?.network;
    return (
      !this.address === !ethAddress &&
      (!this.address || this.address.toString() === ethAddress!.toString()) &&
      !this.network === !network &&
      (!this.network || this.network.chainId === network!.chainId)
    );
  }

  destroy() {
    this.unsubscribeToPublicBalance();
    this.unsubscribeToPendingBalance();
  }

  on(event: EthAccountEvent, subscriber: Subscriber) {
    if (this.subscribers[event].some(s => s === subscriber)) {
      debug('Duplicated subscription.');
      return;
    }

    this.subscribers[event].push(subscriber);
    if (this.subscribers[event].length === 1) {
      switch (event) {
        case EthAccountEvent.UPDATED_PUBLIC_BALANCE:
          this.resumePublicBalance();
          break;
        case EthAccountEvent.UPDATED_PENDING_BALANCE:
          this.resumePendingBalance();
          break;
        default:
      }
    }

    return this;
  }

  off(event: EthAccountEvent, subscriber: Subscriber) {
    this.subscribers[event] = this.subscribers[event].filter(s => s !== subscriber);
    return this;
  }

  async refreshPublicBalance() {
    return this.checkPublicBalance();
  }

  async refreshPendingBalance() {
    return this.checkPendingBalance();
  }

  private async checkPublicBalance() {
    const value = this.active ? await this.getPublicBalance() : 0n;
    if (this.active) {
      this.publicBalance.lastSynced = Date.now();
    }
    if (value !== this.publicBalance.value) {
      this.publicBalance.value = value;
      this.emit(EthAccountEvent.UPDATED_PUBLIC_BALANCE, value);
    }
    return value;
  }

  private async getPublicBalance() {
    if (!this.web3Provider) {
      debug(`Web3Provider undefined`);
      return 0n;
    }

    // TODO - handle token assets
    return BigInt(await this.web3Provider.getBalance(this.address!.toString()));
  }

  private resumePublicBalance() {
    const isOutdated = Date.now() - this.publicBalance.lastSynced > this.publicBalanceInterval;
    if (!this.publicBalanceSubscriber || isOutdated) {
      this.unsubscribeToPublicBalance();
      this.subscribeToPublicBalance(isOutdated);
    }
  }

  private async subscribeToPublicBalance(checkOnLoad: boolean) {
    if (!this.address) {
      return;
    }

    if (this.publicBalanceSubscriber !== undefined) {
      debug('Already subscribed to public balance changes.');
      return;
    }

    const checkBalance = async () => {
      if (!this.subscribers[EthAccountEvent.UPDATED_PUBLIC_BALANCE].length) return;

      await this.checkPublicBalance();
    };

    if (checkOnLoad) {
      await checkBalance();
    }
    this.publicBalanceSubscriber = window.setInterval(checkBalance, this.publicBalanceInterval);
  }

  private unsubscribeToPublicBalance() {
    clearInterval(this.publicBalanceSubscriber);
    this.publicBalanceSubscriber = undefined;
  }

  private async checkPendingBalance() {
    const value = this.active ? await this.accountUtils.getPendingBalance(this.assetId, this.address!) : 0n;
    if (this.active) {
      this.pendingBalance.lastSynced = Date.now();
    }
    if (value !== this.pendingBalance.value) {
      this.pendingBalance.value = value;
      this.emit(EthAccountEvent.UPDATED_PENDING_BALANCE, value);
    }
    return value;
  }

  private resumePendingBalance() {
    const isOutdated = Date.now() - this.pendingBalance.lastSynced > this.pendingBalanceInterval;
    if (!this.pendingBalanceSubscriber || isOutdated) {
      this.unsubscribeToPendingBalance();
      this.subscribeToPendingBalance(isOutdated);
    }
  }

  private async subscribeToPendingBalance(checkOnLoad: boolean) {
    if (!this.address) {
      return;
    }

    if (this.pendingBalanceSubscriber !== undefined) {
      debug('Already subscribed to pending balance changes.');
      return;
    }

    const checkBalance = async () => {
      if (!this.subscribers[EthAccountEvent.UPDATED_PENDING_BALANCE].length) return;

      await this.checkPendingBalance();
    };

    if (checkOnLoad) {
      await this.checkPendingBalance();
    }
    this.pendingBalanceSubscriber = window.setInterval(checkBalance, this.pendingBalanceInterval);
  }

  private unsubscribeToPendingBalance() {
    clearInterval(this.pendingBalanceSubscriber);
    this.pendingBalanceSubscriber = undefined;
  }

  private emit(event: EthAccountEvent, ...args: any) {
    this.subscribers[event].forEach(s => s(...args));
  }
}
