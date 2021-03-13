import { AssetId, EthAddress, WalletSdk } from '@aztec/sdk';
import EventEmitter from 'events';
import { AccountUtils } from '../account_utils';
import createDebug from 'debug';
import { Provider, ProviderEvent, ProviderState } from '../provider';
import { Network } from '../networks';

const debug = createDebug('zm:eth_account');

export enum EthAccountEvent {
  UPDATED_STATE = 'UPDATED_STATE',
  UPDATED_BALANCE = 'UPDATED_BALANCE',
}

export interface EthAccountState {
  ethAddress?: EthAddress;
  publicBalance: bigint;
  pendingBalance: bigint;
  network?: Network;
}

export interface EthAccount {
  on(event: EthAccountEvent.UPDATED_STATE, listener: (state: EthAccountState) => void): this;
  on(event: EthAccountEvent.UPDATED_BALANCE, listener: (publicBalance: bigint) => void): this;
}

export class EthAccount extends EventEmitter {
  private readonly address?: EthAddress;
  private isAddressContract!: boolean;
  private ethAccountState: EthAccountState;
  private balanceSubscriber?: number;

  private readonly balanceInterval = 10000;

  constructor(
    public provider: Provider | undefined,
    private sdk: WalletSdk,
    private accountUtils: AccountUtils,
    private assetId: AssetId,
  ) {
    super();

    this.address = provider?.account;
    this.ethAccountState = {
      ethAddress: this.address,
      publicBalance: 0n,
      pendingBalance: 0n,
    };
  }

  get state() {
    return this.ethAccountState;
  }

  get isActive() {
    return this.accountUtils.isActiveProvider(this.provider);
  }

  get isContract() {
    return this.isAddressContract;
  }

  isSameAddress(ethAddress?: EthAddress) {
    return !this.address === !ethAddress && (!this.address || this.address.toString() === ethAddress?.toString());
  }

  destroy() {
    this.removeAllListeners();
    clearInterval(this.balanceSubscriber);
    this.provider?.off(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
  }

  async init() {
    if (!this.address) return;

    const pendingBalance = await this.accountUtils.getPendingBalance(this.assetId, this.address);
    const network = this.provider!.network;
    const publicBalance = this.isActive ? await this.sdk.getPublicBalance(this.assetId, this.address) : 0n;
    this.isAddressContract = await this.sdk.isContract(this.address);
    this.updateState({ publicBalance, pendingBalance, network });
    this.provider!.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.subscribeToBalance();
  }

  private subscribeToBalance() {
    if (this.balanceSubscriber !== undefined) {
      debug('Already subscribed to balance changes.');
      return;
    }

    const checkBalance = async () => {
      const publicBalance = this.isActive ? await this.sdk.getPublicBalance(this.assetId, this.address!) : 0n;
      if (publicBalance !== this.ethAccountState.publicBalance) {
        this.updateState({ publicBalance });
        this.emit(EthAccountEvent.UPDATED_BALANCE, publicBalance);
      }
    };

    this.balanceSubscriber = window.setInterval(checkBalance, this.balanceInterval);
  }

  private onProviderStateChange = (state: ProviderState) => {
    if (state.network?.chainId !== this.ethAccountState.network?.chainId) {
      this.updateState({ network: state.network });
    }
  };

  private updateState(state: Partial<EthAccountState>) {
    this.ethAccountState = { ...this.ethAccountState, ...state };
    this.emit(EthAccountEvent.UPDATED_STATE, this.state);
  }
}
