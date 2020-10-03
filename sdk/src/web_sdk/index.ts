import { EthAddress } from 'barretenberg/address';
import { getProviderStatus } from 'barretenberg/rollup_provider';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { SdkOptions } from '../core_sdk/create_sdk';
import { createEthSdk, EthereumSdk } from '../ethereum_sdk';
import { SdkEvent, SdkInitState } from '../sdk';
import { chainIdToNetwork, EthProvider, EthProviderEvent } from './eth_provider';

const debug = createDebug('bb:websdk');

export enum AppInitState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
}

export enum AppInitAction {
  LINK_PROVIDER_ACCOUNT,
  LINK_AZTEC_ACCOUNT,
  AWAIT_LINK_AZTEC_ACCOUNT,
  CHANGE_NETWORK,
}

export enum AppEvent {
  UPDATED_INIT_STATE = 'APPEVENT_UPDATED_INIT_STATE',
}

export interface AppInitStatus {
  initState: AppInitState;
  initAction?: AppInitAction;
  account?: EthAddress;
  network?: string;
  message?: string;
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
 * UPDATED_INIT_STATE => INITIALIZING, LINK_AZTEC_ACCOUNT (user accepts, otherwise destroy)
 * UPDATED_INIT_STATE => INITIALIZED, address 1
 * UPDATED_INIT_STATE => INITIALIZING, AWAIT_LINK_AZTEC_ACCOUNT (user changes to unlinked account)
 * UPDATED_INIT_STATE => INITIALIZING, LINK_AZTEC_ACCOUNT (user rejects)
 * UPDATED_INIT_STATE => INITIALIZING, AWAIT_LINK_AZTEC_ACCOUNT
 * UPDATED_INIT_STATE => INITIALIZING, LINK_AZTEC_ACCOUNT (user accepts)
 * UPDATED_INIT_STATE => INITIALIZED, address 2
 * UPDATED_INIT_STATE => INITIALIZED, address 1 (user changes to linked account)
 * UPDATED_INIT_STATE => DESTROYED
 */
export class WebSdk extends EventEmitter {
  private sdk!: EthereumSdk;
  private ethProvider!: EthProvider;
  private initStatus: AppInitStatus = { initState: AppInitState.UNINITIALIZED };

  constructor(private ethereumProvider: any) {
    super();
  }

  public async init(serverUrl: string, sdkOptions: SdkOptions = {}) {
    debug('initializing app...');

    try {
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.LINK_PROVIDER_ACCOUNT);

      this.ethProvider = new EthProvider(this.ethereumProvider);
      await this.ethProvider.init();

      // If our network doesn't match that of the rollup provider, request it be changed until it does.
      const { chainId: rollupProviderChainId, serviceName } = await getProviderStatus(serverUrl);
      this.initStatus.network = chainIdToNetwork(rollupProviderChainId);
      if (rollupProviderChainId !== this.ethProvider.getChainId()) {
        this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.CHANGE_NETWORK);
        while (rollupProviderChainId !== this.ethProvider.getChainId()) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      this.sdk = await createEthSdk(this.ethereumProvider, serverUrl, sdkOptions);

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

      await this.sdk.init();

      // Link account. Will be INITIALZED once complete.
      await this.initLinkAccount();

      // Handle account changes.
      this.ethProvider.on(EthProviderEvent.UPDATED_ACCOUNT, this.accountChanged);

      // Handle users changes.
      this.sdk.on(SdkEvent.UPDATED_USERS, this.usersChanged);

      // Ensure we're still on correct network, and attach handler.
      // Any network changes at this point result in destruction.
      this.networkChanged();
      this.ethProvider.on(EthProviderEvent.UPDATED_NETWORK, this.networkChanged);

      debug('initialization complete.');
    } catch (err) {
      this.destroy();
      throw err;
    }
  }

  private updateInitStatus(initState: AppInitState, initAction?: AppInitAction, message?: string) {
    const previous = this.initStatus;
    this.initStatus = {
      ...this.initStatus,
      initState,
      initAction,
      message,
    };
    this.emit(AppEvent.UPDATED_INIT_STATE, { ...this.initStatus }, previous);
  }

  private accountChanged = (account?: EthAddress) => {
    this.initStatus.account = account;
    if (!account) {
      this.destroy();
      return;
    }

    const user = this.sdk.getUser(account);
    if (!user) {
      // We are initializing until the account is added to sdk.
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.AWAIT_LINK_AZTEC_ACCOUNT);
    } else {
      this.updateInitStatus(AppInitState.INITIALIZED);
    }
  };

  private usersChanged = () => {
    const account = this.ethProvider.getAccount()!;
    const user = this.sdk.getUser(account);
    if (!user) {
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.AWAIT_LINK_AZTEC_ACCOUNT);
    }
  };

  private networkChanged = () => {
    if (!this.isCorrectNetwork()) {
      this.destroy();
    }
  };

  private async initLinkAccount() {
    const account = this.ethProvider.getAccount();
    this.initStatus.account = account;
    if (!account) {
      throw new Error('Account access withdrawn.');
    }

    const user = this.sdk.getUser(account);
    if (!user) {
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.LINK_AZTEC_ACCOUNT);
      try {
        await this.sdk.addUser(account);
      } catch (e) {
        debug(e);
        throw new Error('Account link rejected.');
      }
    }
    this.updateInitStatus(AppInitState.INITIALIZED);
  }

  public linkAccount = async () => {
    const account = this.ethProvider.getAccount();
    this.initStatus.account = account;
    if (!account) {
      this.destroy();
      return;
    }

    const user = this.sdk.getUser(account);
    if (!user) {
      this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.LINK_AZTEC_ACCOUNT);
      try {
        await this.sdk.addUser(account);
      } catch (e) {
        debug(e);
        this.updateInitStatus(AppInitState.INITIALIZING, AppInitAction.AWAIT_LINK_AZTEC_ACCOUNT);
        return;
      }
    }
    this.updateInitStatus(AppInitState.INITIALIZED);
  };

  public async destroy() {
    debug('destroying app...');
    await this.sdk?.destroy();
    this.ethProvider?.destroy();
    this.initStatus.account === undefined;
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
    return this.sdk.getUser(this.initStatus.account!)!;
  }
}
