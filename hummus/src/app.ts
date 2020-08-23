import { Sdk, createSdk, SdkEvent, getRollupProviderStatus, SdkInitState } from 'aztec2-sdk';
import createDebug from 'debug';
import { EthProvider, Web3EthProvider, EthProviderEvent, chainIdToNetwork } from './eth_provider';
import { EthereumProvider } from 'aztec2-sdk/ethereum_provider';
import { EventEmitter } from 'events';
import { EthAddress } from 'barretenberg/address';

const debug = createDebug('bb:app');

export enum AppInitState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
}

export enum AppInitAction {
  LINK_PROVIDER_ACCOUNT,
  LINK_AZTEC_ACCOUNT,
  CHANGE_NETWORK,
}

export enum AppEvent {
  UPDATED_INIT_STATE = 'APPEVENT_UPDATED_INIT_STATE',
  UPDATED_ACCOUNT = 'APPEVENT_UPDATED_ACCOUNT',
}

export interface AppInitStatus {
  initState: AppInitState;
  initAction?: AppInitAction;
  network?: string;
  message?: string;
}

export class App extends EventEmitter {
  private sdk!: Sdk;
  private ethProvider!: EthProvider;
  private initStatus: AppInitStatus = { initState: AppInitState.UNINITIALIZED };

  constructor(private ethereumProvider: EthereumProvider) {
    super();
  }

  public async init(serverUrl: string, clearDb = false) {
    debug('initializing app...');

    try {
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.LINK_PROVIDER_ACCOUNT);

      this.ethProvider = new Web3EthProvider(this.ethereumProvider);
      await this.ethProvider.init();

      // If our network doesn't match that of the rollup provider, request it be changed until it does.
      const { chainId: rollupProviderChainId } = await getRollupProviderStatus(serverUrl);
      this.initStatus.network = chainIdToNetwork(rollupProviderChainId);
      if (rollupProviderChainId !== this.ethProvider.getChainId()) {
        this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.CHANGE_NETWORK);
        while (rollupProviderChainId !== this.ethProvider.getChainId()) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      this.sdk = await createSdk(serverUrl, this.ethereumProvider, { clearDb });

      // Forward all sdk events. This allows subscribing to the events on the App, before we have called init().
      for (const e in SdkEvent) {
        const event = (SdkEvent as any)[e];
        this.sdk.on(event, (...args: any[]) => this.emit(event, ...args));
      }

      // Handle SDK init messages.
      this.sdk.on(SdkEvent.UPDATED_INIT_STATE, (initState: SdkInitState, msg?: string) => {
        if (initState === SdkInitState.INITIALIZING) {
          this.updateInitStatus(AppInitState.INITIALIZING, undefined, msg);
        }
      });

      // Handle account change.
      this.ethProvider.on(EthProviderEvent.UPDATED_ACCOUNT, (account?: EthAddress) =>
        this.accountChanged(account).catch(err => this.destroy()),
      );

      // Handle network change.
      this.ethProvider.on(EthProviderEvent.UPDATED_NETWORK, () => this.networkChanged());

      await this.sdk.init();

      await this.accountChanged(this.ethProvider.getAccount());

      this.updateInitStatus(AppInitState.INITIALIZED);
      debug('initialization complete.');
    } catch (err) {
      this.destroy();
      throw err;
    }
  }

  private updateInitStatus(initState: AppInitState, initAction?: AppInitAction, message?: string) {
    this.initStatus = {
      initState,
      initAction,
      message,
    };
    this.emit(AppEvent.UPDATED_INIT_STATE, this.initStatus);
  }

  private async accountChanged(account?: EthAddress) {
    if (!account) {
      // If the user withdraws access, destroy everything and return to uninitialized state.
      throw new Error('Account access withdrawn.');
    }

    // Otherwise, we are initializing until the account is added to sdk.
    const user = this.sdk.getUser(account);
    if (!user) {
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.LINK_AZTEC_ACCOUNT);
      await this.sdk.addUser(account);
      this.updateInitStatus(AppInitState.INITIALIZED);
    }

    this.emit(AppEvent.UPDATED_ACCOUNT, account);
  }

  private networkChanged() {
    if (!this.isCorrectNetwork()) {
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.CHANGE_NETWORK);
    } else {
      this.updateInitStatus(AppInitState.INITIALIZED);
    }
  }

  public async destroy() {
    debug('destroying app...');
    await this.sdk?.destroy();
    this.ethProvider?.destroy();
    this.updateInitStatus(AppInitState.UNINITIALIZED);
  }

  public getSdk() {
    return this.sdk;
  }

  public isInitialized() {
    return this.getInitStatus().initState === AppInitState.INITIALIZED;
  }

  public isCorrectNetwork() {
    const { chainId } = this.sdk.getLocalStatus();
    return this.ethProvider.getChainId() === chainId;
  }

  public getInitStatus() {
    return this.initStatus;
  }

  public getUser() {
    return this.sdk.getUser(this.ethProvider.getAccount())!;
  }

  public getAccount() {
    return this.ethProvider.getAccount();
  }
}
