import type { CutdownAsset } from './types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { SdkObs } from 'alt-model/top_level_context/sdk_obs';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import Cookie from 'js-cookie';
import { Config } from '../config';
import { ShieldFormValues } from './account_forms';
import { Database } from './database';
import { SystemMessage } from './form';
import { chainIdToNetwork, Network } from './networks';
import { PriceFeedService } from './price_feed_service';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as S } from 'alt-model/known_assets/known_asset_addresses';
import {
  initialLoginState,
  initialWorldState,
  LoginMode,
  LoginState,
  UserSession,
  UserSessionEvent,
} from './user_session';
import { WalletId, wallets } from './wallet_providers';

const debug = createDebug('zm:app');

export enum AppAction {
  NADA,
  LOGIN,
  ACCOUNT,
}

export enum AppEvent {
  SESSION_CLOSED = 'SESSION_CLOSED',
  SESSION_OPEN = 'SESSION_OPEN',
  UPDATED_LOGIN_STATE = 'UPDATED_LOGIN_STATE',
  UPDATED_USER_SESSION_DATA = 'UPDATED_USER_SESSION_DATA',
  UPDATED_SYSTEM_MESSAGE = 'UPDATED_SYSTEM_MESSAGE',
}

export interface App {
  on(event: AppEvent.SESSION_CLOSED, listener: () => void): this;
  on(event: AppEvent.SESSION_OPEN, listener: () => void): this;
  on(event: AppEvent.UPDATED_LOGIN_STATE, listener: (state: LoginState) => void): this;
  on(event: AppEvent.UPDATED_USER_SESSION_DATA, listener: () => void): this;
  on(event: AppEvent.UPDATED_SYSTEM_MESSAGE, listener: (message: SystemMessage) => void): this;
}

export class App extends EventEmitter {
  readonly db: Database;
  readonly priceFeedService: PriceFeedService;
  private session?: UserSession;
  private activeAsset: number;
  private loginMode = LoginMode.SIGNUP;
  private shieldForAliasAmountPreselection?: bigint;
  public readonly requiredNetwork: Network;
  private readonly sessionCookieName = '_zkmoney_session_v1';
  private readonly walletCacheName = 'zm_wallet';

  constructor(
    private readonly config: Config,
    private readonly assets: CutdownAsset[],
    private readonly sdkObs: SdkObs,
    initialAsset: number,
    initialLoginMode: LoginMode,
  ) {
    super();
    if (config.debug) {
      createDebug.enable('zm:*');
    }
    this.requiredNetwork = chainIdToNetwork(config.chainId)!;
    if (!this.requiredNetwork) {
      throw new Error(`Unknown network for chainId ${config.chainId}.`);
    }
    this.db = new Database();
    this.activeAsset = initialAsset;
    this.loginMode = initialLoginMode;
    const provider = new JsonRpcProvider(config.mainnetEthereumHost);
    this.priceFeedService = new PriceFeedService(
      { [S.ETH]: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419' },
      provider,
      assets,
    );
    this.priceFeedService.init();
  }

  async destroy() {
    this.removeAllListeners();
    await this.session?.destroy();
    if (this.db.isOpen) {
      await this.db.close();
    }
    this.priceFeedService.destroy();
  }

  hasSession() {
    return !!this.session;
  }

  getSession() {
    return this.session;
  }

  hasCookie() {
    return !!Cookie.get(this.sessionCookieName);
  }

  get availableWallets() {
    const supportedWallets = window.ethereum ? wallets : wallets.filter(w => w.id !== WalletId.METAMASK);
    return supportedWallets;
  }

  get loginState() {
    return (
      this.session?.getLoginState() || {
        ...initialLoginState,
        mode: this.loginMode,
      }
    );
  }

  get sdk() {
    return this.session?.getSdk();
  }

  get provider() {
    return this.session?.getProvider();
  }

  get keyVault() {
    return this.session?.getKeyVault();
  }

  get stableEthereumProvider() {
    return this.session?.getStableEthereumProvider();
  }

  get rollupService() {
    return this.session?.getRollupService();
  }

  get providerState() {
    return this.session?.getProviderState();
  }

  get worldState() {
    return this.session?.getWorldState() || initialWorldState;
  }

  get accountState() {
    return this.session?.getAccount()?.getAccountState();
  }

  get shieldForAliasForm() {
    return this.session?.getShieldForAliasForm()?.getValues();
  }

  isProcessingAction() {
    return this.session?.isProcessingAction() || false;
  }

  updateShieldForAliasAmountPreselection(amount: bigint) {
    this.shieldForAliasAmountPreselection = amount;
  }

  changeLoginMode(mode: LoginMode) {
    if (mode === this.loginMode) return;

    this.loginMode = mode;
    if (this.session) {
      this.session.changeLoginMode(mode);
    } else {
      this.emit(AppEvent.UPDATED_LOGIN_STATE, this.loginState);
    }
  }

  createSession = () => {
    if (this.session) {
      throw new Error('Previous session not destroyed.');
    }

    this.session = new UserSession(
      this.assets,
      this.config,
      this.sdkObs,
      this.requiredNetwork,
      this.activeAsset,
      this.loginMode,
      this.db,
      this.priceFeedService,
      this.sessionCookieName,
      this.walletCacheName,
      this.shieldForAliasAmountPreselection,
    );

    for (const e in UserSessionEvent) {
      const event = (UserSessionEvent as any)[e];
      this.session.on(event, (...args) => {
        switch (event) {
          case UserSessionEvent.SESSION_CLOSED:
            this.session = undefined;
            debug('Session closed.');
            this.emit(AppEvent.SESSION_CLOSED);
            break;
          case UserSessionEvent.SESSION_OPEN:
            this.emit(AppEvent.SESSION_OPEN);
            break;
          case UserSessionEvent.UPDATED_LOGIN_STATE: {
            const { mode } = this.session!.getLoginState();
            this.loginMode = mode;
            this.emit(AppEvent.UPDATED_LOGIN_STATE, ...args);
            break;
          }
          case UserSessionEvent.UPDATED_SYSTEM_MESSAGE:
            this.emit(AppEvent.UPDATED_SYSTEM_MESSAGE, ...args);
            break;
          default:
            this.emit(AppEvent.UPDATED_USER_SESSION_DATA);
        }
      });
    }
  };

  connectWallet = async (walletId: WalletId) => {
    await this.session!.connectWallet(walletId);
  };

  disconnectWallet = async () => {
    await this.session!.disconnectWallet();
  };

  setAlias = (aliasInput: string) => {
    this.session!.setAlias(aliasInput);
  };

  setRememberMe = (rememberMe: boolean) => {
    this.session!.setRememberMe(rememberMe);
  };

  confirmAlias = async (aliasInput: string) => {
    await this.session!.confirmAlias(aliasInput);
  };

  forgotAlias = () => {
    this.session!.forgotAlias();
  };

  initAccount = async () => {
    await this.session!.initAccount();
  };

  backgroundLogin = async () => {
    this.createSession();
    await this.session!.backgroundLogin();
  };

  logout = async () => {
    if (!this.session) {
      debug('Attempt to logout before login.');
      return;
    }
    const session = this.session;
    this.session = undefined;
    session!.removeAllListeners();
    this.emit(AppEvent.SESSION_CLOSED);
    await session!.close();
  };

  changeWallet = async (walletId: WalletId) => {
    await this.session!.changeWallet(walletId);
  };

  changeShieldForAliasForm = (inputs: ShieldFormValues) => {
    this.session!.changeShieldForAliasForm(inputs);
  };

  claimUserName = async (isRetry?: boolean) => {
    await this.session!.claimUserName(isRetry);
  };
}
