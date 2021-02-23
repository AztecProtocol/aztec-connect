import { AssetId } from '@aztec/sdk';
import { ApolloClient } from 'apollo-boost';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { Config } from '../config';
import { AccountState, initialAccountState } from './account';
import { AccountAction } from './account_txs';
import { Database } from './database';
import { Form, SystemMessage } from './form';
import { GraphQLService } from './graphql_service';
import { getNetwork, Network } from './networks';
import { ProviderState } from './provider';
import {
  initialLoginState,
  initialWorldState,
  LoginState,
  UserSession,
  UserSessionEvent,
  WorldState,
} from './user_session';
import { Wallet } from './wallet_providers';

const debug = createDebug('zm:app');

export enum AppEvent {
  SESSION_STARTED = 'SESSION_STARTED',
  UPDATED_LOGIN_STATE = 'UPDATED_LOGIN_STATE',
  UPDATED_PROVIDER_STATE = 'UPDATED_PROVIDER_STATE',
  UPDATED_ACTION_STATE = 'UPDATED_ACTION_STATE',
  UPDATED_WORLD_STATE = 'UPDATED_WORLD_STATE',
  UPDATED_ACCOUNT_STATE = 'UPDATED_ACCOUNT_STATE',
  UPDATED_FORM_INPUTS = 'UPDATED_FORM_INPUTS',
  UPDATED_SYSTEM_MESSAGE = 'UPDATED_SYSTEM_MESSAGE',
}

export interface App {
  on(event: AppEvent.SESSION_STARTED, listener: () => void): this;
  on(event: AppEvent.UPDATED_LOGIN_STATE, listener: (state: LoginState) => void): this;
  on(event: AppEvent.UPDATED_PROVIDER_STATE, listener: (state: ProviderState) => void): this;
  on(event: AppEvent.UPDATED_WORLD_STATE, listener: (state: WorldState) => void): this;
  on(
    event: AppEvent.UPDATED_ACTION_STATE,
    listener: (action: AccountAction, locked: boolean, processing: boolean) => void,
  ): this;
  on(event: AppEvent.UPDATED_ACCOUNT_STATE, listener: (state: AccountState) => void): this;
  on(event: AppEvent.UPDATED_FORM_INPUTS, listener: (action: AccountAction, inputs: Form) => void): this;
  on(event: AppEvent.UPDATED_SYSTEM_MESSAGE, listener: (message: SystemMessage) => void): this;
}

export class App extends EventEmitter {
  private db: Database;
  private graphql: GraphQLService;
  private session?: UserSession;
  public requiredNetwork: Network;

  constructor(private config: Config, apollo: ApolloClient<any>) {
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
    return this.session?.getAccount()?.getAccountState() || initialAccountState;
  }

  get accountAction() {
    return this.session?.getAccount()?.getAccountAction();
  }

  isProcessingAction() {
    return this.session?.getAccount()?.isProcessingAction() || false;
  }

  createSession = () => {
    if (this.session) {
      throw new Error('Previous session not destroyed.');
    }

    this.session = new UserSession(this.config, this.requiredNetwork, this.db, this.graphql);
    this.session.on(UserSessionEvent.SESSION_CLOSED, () => {
      this.session = undefined;
      debug('Session destroyed.');
    });
    for (const e in UserSessionEvent) {
      const event = (UserSessionEvent as any)[e];
      this.session.on(event, (...args) => this.emit(event, ...args));
    }
    this.emit(AppEvent.SESSION_STARTED);
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

  initSdk = async () => {
    await this.session!.initSdk();
  };

  restart = async () => {
    const session = this.session;
    this.session = undefined;
    this.createSession();
    session!.removeAllListeners();
    await session!.close();
  };

  logout = async () => {
    const session = this.session;
    this.session = undefined;
    session!.removeAllListeners();
    await session!.close();
  };

  changeWallet = async (wallet: Wallet) => {
    await this.session!.changeWallet(wallet);
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

  changeAsset = (assetId: AssetId) => {
    this.session!.getAccount().changeAsset(assetId);
  };

  selectAction = (action: AccountAction) => {
    this.session!.getAccount().selectAction(action);
  };

  clearAction = () => {
    this.session!.getAccount().clearAction();
  };
}
