import { AssetId, EthAddress, WalletSdk } from '@aztec/sdk';
import EventEmitter from 'events';
import { AccountUtils } from '../account_utils';
import createDebug from 'debug';
import { Provider, ProviderEvent, ProviderState } from '../provider';
import { Network } from '../networks';

const debug = createDebug('zm:eth_account');

export enum EthAccountEvent {
  UPDATED_STATE = 'UPDATED_STATE',
}

export interface EthAccountState {
  ethAddress?: EthAddress;
  publicBalance: bigint;
  pendingBalance: bigint;
  network?: Network;
}

export class EthAccount extends EventEmitter {
  private readonly address?: EthAddress;
  private ethAccountState: EthAccountState;
  private balanceSubscriber?: number;

  private readonly balanceInterval = 10000;

  constructor(
    private provider: Provider | undefined,
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
    await this.subscribeToBalance();
    this.updateState({ pendingBalance, network });
    this.provider!.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
  }

  private async subscribeToBalance() {
    if (this.balanceSubscriber !== undefined) {
      debug('Already subscribed to balance changes.');
      return;
    }

    const checkBalance = async () => {
      const isActive = this.accountUtils.isActiveProvider(this.provider);
      const publicBalance = isActive ? await this.sdk.getPublicBalance(this.assetId, this.address!) : 0n;
      if (publicBalance !== this.ethAccountState.publicBalance) {
        this.updateState({ publicBalance });
      }
    };

    await checkBalance();
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
