import { EthAddress, EthereumProvider } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { MessageType } from './form';
import { chainIdToNetwork, Network } from './networks';
import { createWalletProvider, ProviderConfig, Wallet, WalletProvider, wallets } from './wallet_providers';

const debug = createDebug('zm:provider');

export enum ProviderStatus {
  UNINITIALIZED,
  INITIALIZING,
  INITIALIZED,
  DESTROYED,
}

export interface ProviderState {
  wallet: Wallet;
  status: ProviderStatus;
  account?: EthAddress;
  network?: Network;
}

export enum ProviderEvent {
  UPDATED_PROVIDER_STATE = 'UPDATED_PROVIDER_STATE',
  UPDATED_NETWORK = 'UPDATED_NETWORK',
  UPDATED_ACCOUNT = 'UPDATED_ACCOUNT',
  LOG_MESSAGE = 'LOG_MESSAGE',
}

export interface Provider {
  on(event: ProviderEvent.UPDATED_PROVIDER_STATE, listener: (state: ProviderState) => void): this;
  on(event: ProviderEvent.UPDATED_NETWORK, listener: (network: Network) => void): this;
  on(event: ProviderEvent.UPDATED_ACCOUNT, listener: (account: EthAddress) => void): this;
  on(event: ProviderEvent.LOG_MESSAGE, listener: (message: string, messageType: MessageType) => void): this;
}

export class Provider extends EventEmitter {
  private accounts: EthAddress[] = [];
  private state: ProviderState;
  private walletProvider!: WalletProvider;
  public ethereumProvider!: EthereumProvider;
  private isUserProvider = true;

  constructor(public wallet: Wallet, config: ProviderConfig) {
    super();
    this.walletProvider = createWalletProvider(wallet, config)!;
    this.state = {
      wallet,
      status: ProviderStatus.UNINITIALIZED,
    };
    this.isUserProvider = wallet !== Wallet.HOT;
  }

  private get destroyed() {
    return this.state.status === ProviderStatus.DESTROYED;
  }

  get chainId() {
    return this.state.network!.chainId || 0;
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

  getState() {
    return this.state;
  }

  async init(requiredNetwork?: Network) {
    this.updateState({ status: ProviderStatus.INITIALIZING });

    const walletName = wallets[this.wallet].name;

    if (!this.walletProvider) {
      this.updateState({ status: ProviderStatus.UNINITIALIZED });
      throw new Error(`${walletName} not installed.`);
    }

    this.ethereumProvider = this.walletProvider.ethereumProvider;
    const ethersProvider = new Web3Provider(this.ethereumProvider);

    this.log(`Please check ${walletName} to continue...`, MessageType.WARNING);

    try {
      await this.walletProvider.connect();
    } catch (e) {
      debug(e);
      this.updateState({ status: ProviderStatus.UNINITIALIZED });
      throw new Error(`Unable to connect to ${walletName}.`);
    }

    this.ethereumProvider.on('disconnect', this.handleDisconnect);
    this.ethereumProvider.on('chainChanged', this.updateNetwork);
    if (this.isUserProvider) {
      this.ethereumProvider.on('accountsChanged', this.updateAccounts);
    }

    const chainId = (await ethersProvider.getNetwork()).chainId;
    this.updateNetwork(`${chainId}`);

    if (this.isUserProvider) {
      const accounts = await ethersProvider.listAccounts();
      this.updateAccounts(accounts);
    }

    if (requiredNetwork && this.chainId !== requiredNetwork.chainId) {
      this.log(`Please switch your wallet's network to ${requiredNetwork.network}...`, MessageType.WARNING);
      while (this.chainId !== requiredNetwork.chainId && !this.destroyed) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!this.destroyed) {
      this.updateState({ status: ProviderStatus.INITIALIZED });
    }
  }

  async destroy() {
    this.updateState({ status: ProviderStatus.DESTROYED });
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
    await this.destroy();
  };

  private updateNetwork = (chainId: string) => {
    const network = chainIdToNetwork(+chainId);
    this.updateState({ network });
    this.emit(ProviderEvent.UPDATED_NETWORK, network);
  };

  private updateAccounts = (accounts: string[]) => {
    if (this.accounts.length && !accounts.length) {
      this.handleDisconnect();
    }
    this.accounts = accounts.map(EthAddress.fromString);
    this.updateState({ account: this.accounts[0] });
    this.emit(ProviderEvent.UPDATED_ACCOUNT, this.accounts[0]);
  };

  private updateState(state: Partial<ProviderState>) {
    this.state = { ...this.state, ...state };
    this.emit(ProviderEvent.UPDATED_PROVIDER_STATE, this.state);
  }
}
