import { EthAddress, EthereumProvider } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { MessageType } from './form';
import { chainIdToNetwork, Network } from './networks';
import { createWalletProvider, ProviderConfig, WalletId, WalletProvider, wallets } from './wallet_providers';

const debug = createDebug('zm:provider');

export enum ProviderStatus {
  UNINITIALIZED,
  INITIALIZING,
  INITIALIZED,
  DESTROYED,
}

export interface ProviderState {
  walletId: WalletId;
  status: ProviderStatus;
  account?: EthAddress;
  network?: Network;
}

export enum ProviderEvent {
  UPDATED_PROVIDER_STATE = 'UPDATED_PROVIDER_STATE',
  LOG_MESSAGE = 'LOG_MESSAGE',
}

export interface Provider {
  on(
    event: ProviderEvent.UPDATED_PROVIDER_STATE,
    listener: (state: ProviderState, prevState: ProviderState) => void,
  ): this;
  on(event: ProviderEvent.LOG_MESSAGE, listener: (message: string, messageType: MessageType) => void): this;
}

export class Provider extends EventEmitter {
  private accounts: EthAddress[] = [];
  private state: ProviderState;
  private walletProvider!: WalletProvider;
  public ethereumProvider!: EthereumProvider;

  constructor(public walletId: WalletId, config: ProviderConfig) {
    super();
    this.walletProvider = createWalletProvider(walletId, config)!;
    this.state = {
      walletId,
      status: ProviderStatus.UNINITIALIZED,
    };
  }

  public get destroyed() {
    return this.state.status === ProviderStatus.DESTROYED;
  }

  public get initialized() {
    return this.state.status === ProviderStatus.INITIALIZED;
  }

  get chainId() {
    return this.state.network?.chainId || 0;
  }

  get network() {
    return chainIdToNetwork(this.chainId);
  }

  get account() {
    return this.state.account;
  }

  get status() {
    return this.state.status;
  }

  get connected() {
    return this.walletProvider.connected;
  }

  getState() {
    return this.state;
  }

  async init(requiredNetwork?: Network) {
    this.updateState({ status: ProviderStatus.INITIALIZING });

    const walletName = wallets[this.walletId].name;

    if (!this.walletProvider) {
      this.updateState({ status: ProviderStatus.UNINITIALIZED });
      throw new Error(`${walletName} not installed.`);
    }

    this.ethereumProvider = this.walletProvider.ethereumProvider;
    const ethersProvider = new Web3Provider(this.ethereumProvider);

    const promptTimeout = setTimeout(() => {
      this.log(`Please check ${walletName} to continue...`, MessageType.WARNING);
    }, 1000);

    try {
      await this.walletProvider.connect();
    } catch (e) {
      debug(e);
      this.updateState({ status: ProviderStatus.UNINITIALIZED });
      throw new Error(`Unable to connect to ${walletName}.`);
    } finally {
      clearTimeout(promptTimeout);
    }

    this.ethereumProvider.on('disconnect', this.handleDisconnect);
    this.ethereumProvider.on('chainChanged', this.updateNetwork);
    this.ethereumProvider.on('accountsChanged', this.updateAccounts);

    const chainId = (await ethersProvider.getNetwork()).chainId;
    this.updateNetwork(`${chainId}`);

    const accounts = await ethersProvider.listAccounts();
    this.updateAccounts(accounts);

    if (requiredNetwork && this.chainId !== requiredNetwork.chainId) {
      this.log(`Please switch your wallet's network to ${requiredNetwork.network}...`, MessageType.WARNING);
      while (this.chainId !== requiredNetwork.chainId) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.destroyed) {
          throw new Error('Wallet disconnected.');
        }
      }
    }

    this.updateState({ status: ProviderStatus.INITIALIZED });
  }

  async disconnect() {
    if (this.ethereumProvider) {
      this.handleDisconnect();
    }
  }

  async destroy() {
    this.removeAllListeners();
    this.ethereumProvider?.removeListener('disconnect', this.handleDisconnect);
    this.ethereumProvider?.removeListener('chainChanged', this.updateNetwork);
    this.ethereumProvider?.removeListener('accountsChanged', this.updateAccounts);
    await this.walletProvider?.disconnect();
  }

  private log(message: string, messageType = MessageType.TEXT) {
    this.emit(ProviderEvent.LOG_MESSAGE, message, messageType);
  }

  private handleDisconnect = async () => {
    this.updateState({ status: ProviderStatus.DESTROYED, account: undefined });
    await this.destroy();
  };

  private updateNetwork = (chainId: string) => {
    const network = chainIdToNetwork(+chainId);
    this.updateState({ network });
  };

  private updateAccounts = async (accounts: string[]) => {
    this.accounts = accounts.map(EthAddress.fromString);
    if (!this.accounts.length) {
      await this.handleDisconnect();
    } else {
      this.updateState({ account: this.accounts[0] });
    }
  };

  private updateState(state: Partial<ProviderState>) {
    const prevState = this.state;
    this.state = { ...this.state, ...state };
    this.emit(ProviderEvent.UPDATED_PROVIDER_STATE, this.state, prevState);
  }
}
