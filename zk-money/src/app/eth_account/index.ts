import { EthAddress } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { AccountUtils } from '../account_utils';
import { Network } from '../networks';
import { Provider, ProviderStatus } from '../provider';
import { PendingBalance } from './pending_balance';
import { PublicBalance } from './public_balance';
import { ValueSubscriber, ValueSubscriberEvent } from './value_subscriber';

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

type ValueListener = (value: bigint) => void;

export interface EthAccount {
  on(event: EthAccountEvent.UPDATED_PUBLIC_BALANCE, listener: (publicBalance: bigint) => void): this;
  on(event: EthAccountEvent.UPDATED_PENDING_BALANCE, listener: (pendingBalance: bigint) => void): this;
}

export class EthAccount {
  private readonly address?: EthAddress;
  private readonly network?: Network;

  private readonly valueSubscribers: { [key in EthAccountEvent]: ValueSubscriber };

  private readonly listeners: { [key in EthAccountEvent]: ValueListener } = {
    [EthAccountEvent.UPDATED_PUBLIC_BALANCE]: (value: bigint) => {
      this.emit(EthAccountEvent.UPDATED_PUBLIC_BALANCE, value);
    },
    [EthAccountEvent.UPDATED_PENDING_BALANCE]: (value: bigint) => {
      this.emit(EthAccountEvent.UPDATED_PENDING_BALANCE, value);
    },
  };

  private subscribers: { [key in EthAccountEvent]: Subscriber[] } = {
    [EthAccountEvent.UPDATED_PUBLIC_BALANCE]: [],
    [EthAccountEvent.UPDATED_PENDING_BALANCE]: [],
  };

  private readonly publicBalanceInterval = 15 * 1000;
  private readonly pendingBalanceInterval = 60 * 1000;

  constructor(
    public readonly provider: Provider | undefined,
    accountUtils: AccountUtils,
    assetId: number,
    assetAddress: EthAddress | undefined,
    private requiredNetwork: Network,
  ) {
    this.address = provider?.account;
    this.network = provider?.network;

    const enableSubscribe = this.address && this.isCorrectNetwork;
    this.valueSubscribers = {
      [EthAccountEvent.UPDATED_PUBLIC_BALANCE]: new PublicBalance(
        enableSubscribe ? this.address : undefined,
        enableSubscribe ? new Web3Provider(provider!.ethereumProvider) : undefined,
        assetId,
        assetAddress,
        this.publicBalanceInterval,
      ),
      [EthAccountEvent.UPDATED_PENDING_BALANCE]: new PendingBalance(
        assetId,
        enableSubscribe ? this.address : undefined,
        accountUtils,
        this.pendingBalanceInterval,
      ),
    };
  }

  get isCorrectNetwork() {
    return this.provider?.network?.chainId === this.requiredNetwork.chainId;
  }

  get state(): EthAccountState {
    return {
      ethAddress: this.address,
      network: this.network,
      publicBalance: this.valueSubscribers[EthAccountEvent.UPDATED_PUBLIC_BALANCE].value,
      pendingBalance: this.valueSubscribers[EthAccountEvent.UPDATED_PENDING_BALANCE].value,
    };
  }

  get active() {
    const { status, account, network } = this.provider?.getState() || {};
    return (
      status === ProviderStatus.INITIALIZED &&
      !!account &&
      account.toString() === this.address?.toString() &&
      network!.chainId === this.requiredNetwork.chainId
    );
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
    Object.values(this.valueSubscribers).forEach(s => s.destroy());
  }

  on(event: EthAccountEvent, subscriber: Subscriber) {
    if (this.subscribers[event].some(s => s === subscriber)) {
      debug('Duplicated subscription.');
      return;
    }

    this.subscribers[event].push(subscriber);
    if (this.subscribers[event].length === 1) {
      this.valueSubscribers[event].refresh(false);
      this.valueSubscribers[event].on(ValueSubscriberEvent.UPDATED_VALUE, this.listeners[event]);
    }

    return this;
  }

  off(event: EthAccountEvent, subscriber: Subscriber) {
    this.subscribers[event] = this.subscribers[event].filter(s => s !== subscriber);
    if (!this.subscribers[event].length) {
      this.valueSubscribers[event].off(ValueSubscriberEvent.UPDATED_VALUE, this.listeners[event]);
    }
    return this;
  }

  async refreshPublicBalance(forceUpdate = true) {
    return this.valueSubscribers[EthAccountEvent.UPDATED_PUBLIC_BALANCE].refresh(forceUpdate);
  }

  async refreshPendingBalance(forceUpdate = true) {
    return this.valueSubscribers[EthAccountEvent.UPDATED_PENDING_BALANCE].refresh(forceUpdate);
  }

  private emit(event: EthAccountEvent, ...args: any) {
    this.subscribers[event].forEach(s => s(...args));
  }
}
