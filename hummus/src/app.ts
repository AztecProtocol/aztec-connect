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

export enum AppEvent {
  UPDATED_INIT_STATE = 'APPEVENT_UPDATED_INIT_STATE',
  UPDATED_ACCOUNT = 'APPEVENT_UPDATED_ACCOUNT',
}

export class App extends EventEmitter {
  private sdk!: Sdk;
  private ethProvider!: EthProvider;
  private initState = AppInitState.UNINITIALIZED;

  constructor(private ethereumProvider: EthereumProvider) {
    super();
  }

  public async init(serverUrl: string, clearDb = false) {
    debug('initializing app...');

    try {
      this.updateInitState(AppInitState.INITIALIZING);

      this.ethProvider = new Web3EthProvider(this.ethereumProvider);
      await this.ethProvider.init();

      // If our network doesn't match that of the rollup provider, request it be changed until it does.
      const { chainId: rollupProviderChainId } = await getRollupProviderStatus(serverUrl);
      if (rollupProviderChainId !== this.ethProvider.getChainId()) {
        this.updateInitState(
          AppInitState.INITIALIZING,
          `Change network to ${chainIdToNetwork(rollupProviderChainId)}...`,
        );
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
          this.emit(AppEvent.UPDATED_INIT_STATE, AppInitState.INITIALIZING, msg);
        }
      });

      // Handle account change.
      this.ethProvider.on(EthProviderEvent.UPDATED_ACCOUNT, (account?: EthAddress) =>
        this.accountChanged(account).catch(debug),
      );

      // Handle network change.
      this.ethProvider.on(EthProviderEvent.UPDATED_NETWORK, () => this.networkChanged());

      this.updateInitState(AppInitState.INITIALIZING, 'Initializing SDK...');
      await this.sdk.init();

      await this.accountChanged(this.ethProvider.getAccount());

      this.updateInitState(AppInitState.INITIALIZED);
      debug('initialization complete.');
    } catch (err) {
      debug(err.message);
      await this.sdk?.destroy();
      this.ethProvider?.destroy();
      this.updateInitState(AppInitState.UNINITIALIZED);
    }
  }

  private updateInitState(state: AppInitState, msg?: string) {
    this.initState = state;
    this.emit(AppEvent.UPDATED_INIT_STATE, state, msg);
  }

  private async accountChanged(account?: EthAddress) {
    try {
      if (!account) {
        // If the user withdraws access, destroy everything and return to uninitialized state.
        throw new Error('Account access withdrawn.');
      }

      // Otherwise, we are initializing until the first account is added to sdk.
      const user = this.sdk.getUser(account);
      if (!user) {
        this.updateInitState(AppInitState.INITIALIZING, 'Adding account, check MetaMask for signature...');
        await this.sdk.addUser(account);
        this.updateInitState(AppInitState.INITIALIZED);
      }

      this.emit(AppEvent.UPDATED_ACCOUNT, account);
    } catch (err) {
      await this.destroy();
      throw err;
    }
  }

  private networkChanged() {
    if (!this.isCorrectNetwork()) {
      this.updateInitState(
        AppInitState.INITIALIZING,
        `Change network to ${chainIdToNetwork(this.sdk.getLocalStatus().chainId)}...`,
      );
    } else {
      this.updateInitState(AppInitState.INITIALIZED);
    }
  }

  public async destroy() {
    debug('destroying app...');
    await this.sdk?.destroy();
    this.ethProvider.destroy();
    this.updateInitState(AppInitState.UNINITIALIZED);
  }

  public getSdk() {
    return this.sdk;
  }

  public isInitialized() {
    return this.getInitState() === AppInitState.INITIALIZED;
  }

  public isCorrectNetwork() {
    const { chainId } = this.sdk.getLocalStatus();
    return this.ethProvider.getChainId() === chainId;
  }

  public getInitState() {
    return this.initState;
  }

  public getUser() {
    return this.sdk.getUser(this.ethProvider.getAccount())!;
  }

  public getAccount() {
    return this.ethProvider.getAccount();
  }
}
