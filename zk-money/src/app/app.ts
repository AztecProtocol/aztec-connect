import { ApolloClient } from 'apollo-boost';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import Cookie from 'js-cookie';
import { Config } from '../config';
import { DepositFormValues } from './account_forms';
import { AccountAction } from './account_txs';
import { AppAssetId } from './assets';
import { Database } from './database';
import { Form, SystemMessage } from './form';
import { GraphQLService } from './graphql_service';
import { getNetwork, Network } from './networks';
import { initialLoginState, initialWorldState, LoginState, UserSession, UserSessionEvent } from './user_session';
import { Wallet } from './wallet_providers';

const debug = createDebug('zm:app');

export enum AppEvent {
  SESSION_CLOSED = 'SESSION_CLOSED',
  UPDATED_LOGIN_STATE = 'UPDATED_LOGIN_STATE',
  UPDATED_USER_SESSION_DATA = 'UPDATED_USER_SESSION_DATA',
  UPDATED_SYSTEM_MESSAGE = 'UPDATED_SYSTEM_MESSAGE',
}

export interface App {
  on(event: AppEvent.SESSION_CLOSED, listener: () => void): this;
  on(event: AppEvent.UPDATED_LOGIN_STATE, listener: (state: LoginState) => void): this;
  on(event: AppEvent.UPDATED_USER_SESSION_DATA, listener: () => void): this;
  on(event: AppEvent.UPDATED_SYSTEM_MESSAGE, listener: (message: SystemMessage) => void): this;
}

export class App extends EventEmitter {
  private db: Database;
  private graphql: GraphQLService;
  private session?: UserSession;
  private activeAsset: AppAssetId;
  public requiredNetwork: Network;
  private readonly sessionCookieName = '_zkmoney_session';
  private readonly accountProofCacheName = 'zm_account_proof';
  private readonly walletCacheName = 'zm_wallet';

  constructor(private config: Config, apollo: ApolloClient<any>, initialAsset: AppAssetId) {
    super();
    if (config.debug) {
      createDebug.enable('zm:*');
    }
    this.requiredNetwork = getNetwork(config.network)!;
    if (!this.requiredNetwork) {
      throw new Error(`Unknown network ${config.network}.`);
    }
    this.db = new Database();
    this.graphql = new GraphQLService(apollo);
    this.activeAsset = initialAsset;
  }

  async destroy() {
    this.removeAllListeners();
    await this.session?.destroy();
    if (this.db.isOpen) {
      await this.db.close();
    }
  }

  hasSession() {
    return !!this.session;
  }

  hasCookie() {
    return !!Cookie.get(this.sessionCookieName);
  }

  hasLocalAccountProof() {
    return !!localStorage.getItem(this.accountProofCacheName);
  }

  get loginState() {
    return this.session?.getLoginState() || initialLoginState;
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

  get assetState() {
    return this.session?.getAccount()?.getAssetState();
  }

  get activeAction() {
    return this.session?.getAccount()?.getActiveAction();
  }

  get txsPublishTime() {
    return this.session?.getAccount()?.txsPublishTime;
  }

  get mergeForm() {
    return this.session?.getAccount()?.getMergeForm();
  }

  get depositForm() {
    return this.session?.getDepositForm()?.getValues();
  }

  isProcessingAction() {
    return this.session?.isProcessingAction() || this.session?.getAccount()?.isProcessingAction() || false;
  }

  createSession = () => {
    if (this.session) {
      throw new Error('Previous session not destroyed.');
    }

    this.session = new UserSession(
      this.config,
      this.requiredNetwork,
      this.activeAsset,
      this.db,
      this.graphql,
      this.sessionCookieName,
      this.accountProofCacheName,
      this.walletCacheName,
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
          case UserSessionEvent.UPDATED_LOGIN_STATE:
            this.emit(AppEvent.UPDATED_LOGIN_STATE, ...args);
            break;
          case UserSessionEvent.UPDATED_SYSTEM_MESSAGE:
            this.emit(AppEvent.UPDATED_SYSTEM_MESSAGE, ...args);
            break;
          default:
            this.emit(AppEvent.UPDATED_USER_SESSION_DATA);
        }
      });
    }
  };

  connectWallet = async (wallet: Wallet) => {
    await this.session!.connectWallet(wallet);
  };

  setSeedPhrase = async (seedPhrase: string) => {
    await this.session!.setSeedPhrase(seedPhrase);
  };

  confirmSeedPhrase = async (seedPhrase: string) => {
    await this.session!.confirmSeedPhrase(seedPhrase);
  };

  setAlias = async (aliasInput: string) => {
    await this.session!.setAlias(aliasInput);
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

  initSdk = async () => {
    await this.session!.initSdk();
  };

  backgroundLogin = async () => {
    this.createSession();
    await this.session!.backgroundLogin();
  };

  resumeLogin = async () => {
    this.createSession();
    await this.session!.resumeLogin();
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

  changeWallet = async (wallet: Wallet) => {
    await this.session!.changeWallet(wallet);
  };

  changeAsset = (assetId: AppAssetId) => {
    this.activeAsset = assetId;
    this.session?.changeAsset(assetId);
  };

  changeDepositForm = (inputs: DepositFormValues) => {
    this.session!.changeDepositForm(inputs);
  };

  claimUserName = () => {
    this.session!.claimUserName();
  };

  changeForm = (action: AccountAction, inputs: Form) => {
    this.session!.getAccount().changeForm(action, inputs);
  };

  validateForm = (action: AccountAction) => {
    this.session!.getAccount().validateForm(action);
  };

  resetFormStep = (action: AccountAction) => {
    this.session!.getAccount().resetFormStep(action);
  };

  submitForm = (action: AccountAction) => {
    this.session!.getAccount().submitForm(action);
  };

  selectAction = (action: AccountAction) => {
    this.session!.getAccount().selectAction(action);
  };

  clearAction = () => {
    this.session!.getAccount().clearAction();
  };
}
