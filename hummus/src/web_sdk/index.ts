import { CreateHostedAztecSdkOptions, EthAddress, getBlockchainStatus, SdkEvent } from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { createEthSdk, EthereumSdk, EthereumSdkUser } from '../ethereum_sdk';
import { chainIdToNetwork, EthProvider, EthProviderEvent } from './eth_provider';

const debug = createDebug('bb:websdk');

export enum AppInitState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
}

export enum AppInitAction {
  LINK_PROVIDER_ACCOUNT = 'LINK_PROVIDER_ACCOUNT',
  AWAITING_PROVIDER_SIGNATURE = 'AWAITING_PROVIDER_SIGNATURE',
  AWAITING_PERMISSION_TO_LINK = 'AWAITING_PERMISSION_TO_LINK',
  CHANGE_NETWORK = 'CHANGE_NETWORK',
}

export enum AppEvent {
  UPDATED_INIT_STATE = 'APPEVENT_UPDATED_INIT_STATE',
}

export interface AppInitStatus {
  initState: AppInitState;
  initAction?: AppInitAction;
  network?: string;
}

/**
 * Simplifies integration of the CoreSdk with a provider such as MetaMask.
 * The event stream will always be ordered like, but may not always include, the following:
 *
 * Initialization starts:
 * UPDATED_INIT_STATE => INITIALIZING, LINK_PROVIDER_ACCOUNT
 * UPDATED_INIT_STATE => INITIALIZING, CHANGE_NETWORK
 * UPDATED_INIT_STATE => INITIALIZING, "info message 1"
 * UPDATED_INIT_STATE => INITIALIZING, "info message 2"
 * UPDATED_INIT_STATE => INITIALIZING, AWAITING_PROVIDER_SIGNATURE (user accepts, otherwise destroy)
 * UPDATED_INIT_STATE => INITIALIZED, address 1
 * UPDATED_INIT_STATE => INITIALIZING, AWAITING_PERMISSION_TO_LINK (user changes to unlinked account)
 * UPDATED_INIT_STATE => INITIALIZING, AWAITING_PROVIDER_SIGNATURE (user rejects)
 * UPDATED_INIT_STATE => INITIALIZING, AWAITING_PERMISSION_TO_LINK
 * UPDATED_INIT_STATE => INITIALIZING, AWAITING_PROVIDER_SIGNATURE (user accepts)
 * UPDATED_INIT_STATE => INITIALIZED, address 2
 * UPDATED_INIT_STATE => INITIALIZED, address 1 (user changes to linked account)
 * UPDATED_INIT_STATE => DESTROYED
 */
export class WebSdk extends EventEmitter {
  private sdk!: EthereumSdk;
  private ethProvider!: EthProvider;
  private initStatus: AppInitStatus = { initState: AppInitState.UNINITIALIZED };
  private user?: EthereumSdkUser;

  constructor(private ethereumProvider: any) {
    super();
  }

  public async init(rollupProviderUrl: string, sdkOptions: CreateHostedAztecSdkOptions) {
    if (sdkOptions.debug) {
      createDebug.enable('bb:*');
    }

    this.ethereumProvider.autoRefreshOnNetworkChange = false;

    debug('initializing app...');

    try {
      const { chainId: rollupProviderChainId } = await getBlockchainStatus(rollupProviderUrl);

      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.LINK_PROVIDER_ACCOUNT);
      this.ethProvider = new EthProvider(this.ethereumProvider);
      await this.ethProvider.init();

      // If our network doesn't match that of the rollup provider, request it be changed until it does.
      this.initStatus.network = chainIdToNetwork(rollupProviderChainId);
      if (rollupProviderChainId !== this.ethProvider.getChainId()) {
        this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.CHANGE_NETWORK);
        while (rollupProviderChainId !== this.ethProvider.getChainId()) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      this.sdk = await createEthSdk(this.ethereumProvider, sdkOptions);

      // Forward all sdk events. This allows subscribing to the events on the App, before we have called init().
      for (const e in SdkEvent) {
        const event = (SdkEvent as any)[e];
        this.sdk.on(event, (...args: any[]) => this.emit(event, ...args));
      }

      await this.sdk.init();

      // Link account. Will be INITIALZED once complete.
      await this.initLinkAccount();

      // Handle account changes.
      this.ethProvider.on(EthProviderEvent.UPDATED_ACCOUNT, this.accountChanged);

      // Ensure we're still on correct network, and attach handler.
      // Any network changes at this point result in destruction.
      await this.networkChanged();
      this.ethProvider.on(EthProviderEvent.UPDATED_NETWORK, this.networkChanged);

      debug('initialization complete.');
    } catch (err) {
      this.destroy();
      throw err;
    }
  }

  private updateInitStatus(initState: AppInitState, initAction?: AppInitAction) {
    const previous = this.initStatus;
    this.initStatus = {
      ...this.initStatus,
      initState,
      initAction,
    };
    // debug(`state ${previous.initState} -> ${initState}: ${initAction}`);
    this.emit(AppEvent.UPDATED_INIT_STATE, { ...this.initStatus }, previous);
  }

  private accountChanged = async (account?: EthAddress) => {
    if (!account) {
      this.destroy();
      return;
    }

    this.user = await this.sdk.getUser(account);
    if (!this.user) {
      // We are initializing until the account is added to sdk.
      debug(`provider emitted account changed to ${account}, requesting permission to link...`);
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.AWAITING_PERMISSION_TO_LINK);
    } else {
      this.updateInitStatus(AppInitState.INITIALIZED);
    }
  };

  private networkChanged = async () => {
    if (!(await this.isCorrectNetwork())) {
      this.destroy();
    }
  };

  private async initLinkAccount() {
    const account = this.ethProvider.getAccount();
    if (!account) {
      throw new Error('Account access withdrawn.');
    }

    this.user = await this.sdk.getUser(account);
    if (!this.user) {
      // Call to addUser will attempt to perform a signature. Alert client.
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.AWAITING_PROVIDER_SIGNATURE);
      try {
        this.user = await this.sdk.addUser(account);
      } catch (e) {
        debug(e);
        throw new Error('Account link rejected.');
      }
    }
    this.updateInitStatus(AppInitState.INITIALIZED);
  }

  public linkAccount = async () => {
    const account = this.ethProvider.getAccount();
    if (!account) {
      this.destroy();
      return;
    }

    this.user = await this.sdk.getUser(account);
    if (!this.user) {
      // Call to addUser will attempt to perform a signature. Alert client.
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.AWAITING_PROVIDER_SIGNATURE);
      try {
        this.user = await this.sdk.addUser(account);
      } catch (e) {
        debug(e);
        this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.AWAITING_PERMISSION_TO_LINK);
        return;
      }
    }
    this.updateInitStatus(AppInitState.INITIALIZED);
  };

  public async loadLatestAccount() {
    this.user = await this.sdk.getUser(this.ethProvider.getAccount()!);
  }

  public async destroy() {
    debug('destroying app...');
    if (this.sdk) {
      await this.sdk.destroy();
    }
    if (this.ethProvider) {
      this.ethProvider.destroy();
    }
    this.user === undefined;
    this.updateInitStatus(AppInitState.UNINITIALIZED);
  }

  public getSdk() {
    return this.sdk;
  }

  public isInitialized() {
    return this.getInitStatus().initState === AppInitState.INITIALIZED;
  }

  public async isCorrectNetwork() {
    const { chainId } = await this.sdk.getLocalStatus();
    return this.ethProvider.getChainId() === chainId;
  }

  public getInitStatus() {
    return this.initStatus;
  }

  public getUser() {
    return this.user!;
  }

  public getAddress() {
    return this.ethProvider.getAccount()!;
  }
}
