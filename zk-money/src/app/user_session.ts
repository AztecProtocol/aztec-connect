import { AccountId, createWalletSdk, GrumpkinAddress, SdkEvent, SdkInitState, WalletSdk } from '@aztec/sdk';
import randomString from 'crypto-random-string';
import createDebug from 'debug';
import { utils } from 'ethers';
import { EventEmitter } from 'events';
import Cookie from 'js-cookie';
import { debounce, DebouncedFunc } from 'lodash';
import { Config } from '../config';
import { Account, AccountEvent, AccountState } from './account';
import { ValueAvailability } from './account_forms';
import { AccountAction } from './account_txs';
import { formatAliasInput, getAliasError } from './alias';
import { Database, LinkedAccount } from './database';
import { Form, MessageType, SystemMessage } from './form';
import { GraphQLService } from './graphql_service';
import { Network } from './networks';
import { Provider, ProviderEvent, ProviderState, ProviderStatus } from './provider';
import { formatSeedPhraseInput, generateSeedPhrase, getSeedPhraseError, sliceSeedPhrase } from './seed_phrase';
import { Wallet, wallets, Web3Signer } from './wallet_providers';

const debug = createDebug('zm:login_handler');

interface SignedInAccount {
  accountPublicKey: GrumpkinAddress;
  privateKey: Buffer;
}

export enum LoginStep {
  CONNECT_WALLET,
  SET_SEED_PHRASE,
  SET_ALIAS,
  INIT_SDK,
  CREATE_ACCOUNT,
  ADD_ACCOUNT,
  SYNC_DATA,
  DONE,
}

export interface LoginState {
  step: LoginStep;
  wallet?: Wallet;
  seedPhrase: string;
  alias: string;
  aliasAvailability: ValueAvailability;
  rememberMe: boolean;
  accountNonce: number;
}

export const initialLoginState: LoginState = {
  step: LoginStep.CONNECT_WALLET,
  wallet: undefined,
  seedPhrase: '',
  alias: '',
  aliasAvailability: ValueAvailability.INVALID,
  rememberMe: true,
  accountNonce: 0,
};

export interface WorldState {
  latestRollup: number;
  syncedToRollup: number;
  accountSyncedToRollup: number;
}

export const initialWorldState: WorldState = { syncedToRollup: -1, latestRollup: -1, accountSyncedToRollup: -1 };

export enum UserSessionEvent {
  UPDATED_LOGIN_STATE = 'UPDATED_LOGIN_STATE',
  UPDATED_PROVIDER_STATE = 'UPDATED_PROVIDER_STATE',
  UPDATED_ACTION_STATE = 'UPDATED_ACTION_STATE',
  UPDATED_WORLD_STATE = 'UPDATED_WORLD_STATE',
  UPDATED_ACCOUNT_STATE = 'UPDATED_ACCOUNT_STATE',
  UPDATED_FORM_INPUTS = 'UPDATED_FORM_INPUTS',
  UPDATED_SYSTEM_MESSAGE = 'UPDATED_SYSTEM_MESSAGE',
  SESSION_CLOSED = 'SESSION_CLOSED',
}

export interface UserSession {
  on(event: UserSessionEvent.UPDATED_LOGIN_STATE, listener: (state: LoginState) => void): this;
  on(event: UserSessionEvent.UPDATED_PROVIDER_STATE, listener: (state: ProviderState) => void): this;
  on(event: UserSessionEvent.UPDATED_WORLD_STATE, listener: (state: WorldState) => void): this;
  on(
    event: UserSessionEvent.UPDATED_ACTION_STATE,
    listener: (action: AccountAction, locked: boolean, processing: boolean) => void,
  ): this;
  on(event: UserSessionEvent.UPDATED_ACCOUNT_STATE, listener: (state: AccountState) => void): this;
  on(event: UserSessionEvent.UPDATED_FORM_INPUTS, listener: (action: AccountAction, inputs: Form) => void): this;
  on(event: UserSessionEvent.UPDATED_SYSTEM_MESSAGE, listener: (message: SystemMessage) => void): this;
  on(event: UserSessionEvent.SESSION_CLOSED, listener: () => void): this;
}

export class UserSession extends EventEmitter {
  private provider!: Provider;
  private sdk!: WalletSdk;
  private linkedAccount?: LinkedAccount;
  private signedInAccount?: SignedInAccount;
  private loginState = initialLoginState;
  private worldState = initialWorldState;
  private account!: Account;
  private debounceCheckAlias: DebouncedFunc<() => void>;

  private readonly debounceCheckAliasWait = 600;
  private readonly sessionCookieName = '_zkmoney_session';

  constructor(
    private config: Config,
    private requiredNetwork: Network,
    private db: Database,
    private graphql: GraphQLService,
  ) {
    super();
    this.debounceCheckAlias = debounce(this.updateAliasAvailability, this.debounceCheckAliasWait);
  }

  getProviderState() {
    return this.provider?.getState();
  }

  getLoginState() {
    return this.loginState;
  }

  getWorldState() {
    return this.worldState;
  }

  getAccount() {
    return this.account;
  }

  async close(message = '', messageType = MessageType.TEXT, clearSession = true) {
    this.emitSystemMessage(message, messageType);
    if (clearSession) {
      this.clearSession();
    }
    this.emit(UserSessionEvent.SESSION_CLOSED);
    await this.destroy();
  }

  async destroy() {
    this.removeAllListeners();
    this.debounceCheckAlias.cancel();
    this.account?.destroy();
    this.provider?.destroy();
    if (this.sdk) {
      this.sdk.removeAllListeners();
      // Can only safely destroy the sdk after it's fully initialized.
      await this.awaitSdkInitialized(this.sdk);
      await this.sdk.destroy();
    }
  }

  connectWallet = async (wallet: Wallet) => {
    if (this.loginState.wallet !== undefined) {
      debug('Duplicated call to connectWallet()');
      return;
    }

    this.updateLoginState({ wallet });

    const walletName = wallets[wallet].name;
    this.emitSystemMessage(`Connecting to ${walletName}...`);

    const { infuraId, network, ethereumHost } = this.config;
    this.provider = new Provider(wallet, { infuraId, network, ethereumHost });
    this.provider.on(ProviderEvent.LOG_MESSAGE, (message: string, type: MessageType) =>
      this.emitSystemMessage(message, type),
    );

    try {
      await this.provider.init(this.requiredNetwork);
    } catch (e) {
      return this.abort(e.message);
    }

    this.emitSystemMessage('Connecting to rollup provider...');

    if (!this.db.isOpen) {
      await this.db.open();
    }

    try {
      const { rollupProviderUrl, debug } = this.config;
      this.sdk = await createWalletSdk(this.provider.ethereumProvider, rollupProviderUrl, { debug });
      // If local rollupContractAddress is empty, it is a new device or the data just got wiped out.
      if (!(await this.getLocalRollupContractAddress())) {
        await this.db.clear();
      }
    } catch (e) {
      debug(e);
      return this.abort(`Something went wrong. This shouldn't happen.`);
    }

    const confirmUserStates = this.ensureUserStates();
    // Leave it to run in the background so that it won't block the ui.
    this.sdk.init();

    this.emitSystemMessage(`Linking your ${walletName} account...`);

    await confirmUserStates;

    const ensureNetworkAndProceed = async (step: LoginStep) => {
      // Ensure we're still on correct network, and attach handler.
      // Any network changes at this point result in destruction.
      if (this.provider.chainId !== this.requiredNetwork.chainId) {
        return this.abort(`Your wallet's network was not on ${this.requiredNetwork.network}.`);
      }

      this.provider.removeAllListeners();
      this.bindProviderEvents();
      await this.toStep(step);
    };

    const linkedAccount = await this.getLinkedAccountFromSession();
    if (linkedAccount) {
      const accountNonce = await this.graphql.getAccountNonce(linkedAccount.accountPublicKey);
      const userId = new AccountId(linkedAccount.accountPublicKey, accountNonce);
      if (this.isUserAdded(userId)) {
        this.linkedAccount = linkedAccount;
        this.clearSystemMessage();
        this.updateLoginState({
          alias: linkedAccount.alias,
          accountNonce,
        });
        return ensureNetworkAndProceed(LoginStep.INIT_SDK);
      }

      await this.db.deleteAccount(linkedAccount.accountPublicKey);
      this.clearSession();
    }

    if (wallet === Wallet.HOT) {
      const seedPhrase = this.generateSeedPhrase();
      this.updateLoginState({ seedPhrase: sliceSeedPhrase(seedPhrase) });
      return this.toStep(LoginStep.SET_SEED_PHRASE);
    }

    this.emitSystemMessage('Check for signature request in your wallet to link account...', MessageType.WARNING);

    try {
      this.signedInAccount = await this.linkAccount();
    } catch (e) {
      debug(e);
      return this.abort('Unable to link your account.');
    }

    this.emitSystemMessage('Checking account status...');

    const accountNonce = await this.graphql.getAccountNonce(this.signedInAccount!.accountPublicKey);
    this.updateLoginState({ accountNonce });

    await ensureNetworkAndProceed(LoginStep.SET_ALIAS);
  };

  changeWallet = async (wallet: Wallet) => {
    if (this.provider.status === ProviderStatus.INITIALIZING) {
      debug('Cannot change wallet before the current one is initialized or destroyed.');
      return;
    }

    const walletName = wallets[wallet].name;
    this.emitSystemMessage(`Connecting to ${walletName}...`);

    const prevProvider = this.provider;
    prevProvider.removeAllListeners();

    const { infuraId, network, ethereumHost } = this.config;
    this.provider = new Provider(wallet, { infuraId, network, ethereumHost });
    this.provider.on(ProviderEvent.LOG_MESSAGE, (message: string, type: MessageType) =>
      this.emitSystemMessage(message, type),
    );
    this.provider.on(ProviderEvent.UPDATED_PROVIDER_STATE, (state: ProviderState) =>
      this.emit(UserSessionEvent.UPDATED_PROVIDER_STATE, state),
    );

    try {
      await this.provider.init(this.requiredNetwork);
    } catch (e) {
      debug(e);
      await this.provider.destroy();
      this.provider = prevProvider;
    }

    this.clearSystemMessage();
    this.provider.removeAllListeners();
    this.bindProviderEvents();
    if (prevProvider !== this.provider) {
      await prevProvider.destroy();
      this.sdk.setProvider(this.provider.ethereumProvider);
      this.account.changeProvider(this.provider);
      this.updateLoginState({ wallet });
    }
  };

  async setSeedPhrase(seedPhrase: string) {
    this.clearSystemMessage();
    return this.updateLoginState({ seedPhrase });
  }

  async confirmSeedPhrase(seedPhraseInput: string) {
    const error = getSeedPhraseError(seedPhraseInput);
    if (error) {
      return this.emitSystemMessage(error, MessageType.ERROR);
    }

    this.emitSystemMessage('Checking account status...');

    this.signedInAccount = await this.createAccountFromSeedPhrase(seedPhraseInput);

    const accountNonce = await this.graphql.getAccountNonce(this.signedInAccount!.accountPublicKey);
    this.updateLoginState({ accountNonce });

    await this.toStep(LoginStep.SET_ALIAS);
  }

  setAlias = async (aliasInput: string) => {
    if (this.loginState.accountNonce) {
      this.clearSystemMessage();
      return this.updateLoginState({ alias: aliasInput, aliasAvailability: ValueAvailability.PENDING });
    }

    this.debounceCheckAlias.cancel();

    if (!aliasInput) {
      // Don't show error for empty input while user's still typing.
      this.clearSystemMessage();
      return this.updateLoginState({
        alias: aliasInput,
        aliasAvailability: ValueAvailability.INVALID,
      });
    }

    const error = getAliasError(aliasInput);
    if (error) {
      this.emitSystemMessage(error, MessageType.ERROR);
      return this.updateLoginState({
        alias: aliasInput,
        aliasAvailability: ValueAvailability.INVALID,
      });
    }

    this.clearSystemMessage();
    this.updateLoginState({ alias: aliasInput, aliasAvailability: ValueAvailability.PENDING });
    this.debounceCheckAlias();
  };

  setRememberMe = (rememberMe: boolean) => {
    this.updateLoginState({ rememberMe });
  };

  confirmAlias = async (aliasInput: string) => {
    const { accountNonce } = this.loginState;
    const error = getAliasError(aliasInput);
    if (error) {
      return this.emitSystemMessage(accountNonce ? 'Incorrect username' : error, MessageType.ERROR);
    }

    if (!accountNonce) {
      if (!(await this.isAliasAvailable(aliasInput))) {
        return this.emitSystemMessage('This username has been taken.', MessageType.ERROR);
      }
    } else {
      const alias = formatAliasInput(aliasInput);
      const address = await this.graphql.getAliasPublicKey(alias);
      const { accountPublicKey } = this.linkedAccount || this.signedInAccount!;
      if (!address?.equals(accountPublicKey)) {
        return this.emitSystemMessage('Incorrect username.', MessageType.ERROR);
      }
    }

    await this.toStep(LoginStep.INIT_SDK);
  };

  initSdk = async () => {
    if (!(await this.awaitSdkInitialized())) {
      return;
    }

    // Check if sdk has been destroyed due to network change.
    const isValidSdk = () => this.sdk.getLocalStatus().initState !== SdkInitState.DESTROYED;

    const proceed = (step: LoginStep) => {
      if (!isValidSdk()) {
        throw new Error('Sdk destroyed.');
      }

      this.toStep(step);
    };

    try {
      const { accountNonce, alias } = this.loginState;

      proceed(accountNonce ? LoginStep.ADD_ACCOUNT : LoginStep.CREATE_ACCOUNT);

      const { accountPublicKey } = this.linkedAccount || this.signedInAccount!;
      const userId = await this.signIn(new AccountId(accountPublicKey, accountNonce), alias);

      const { depositLimit, explorerUrl } = this.config;
      this.account = new Account(
        userId,
        alias,
        this.sdk,
        this.provider,
        this.db,
        this.graphql,
        explorerUrl,
        depositLimit,
      );
      for (const e in AccountEvent) {
        const event = (AccountEvent as any)[e];
        this.account.on(event, (...args) => this.emit(event, ...args));
      }

      const {
        blockchainStatus: { nextRollupId },
      } = await this.sdk.getRemoteStatus();

      proceed(LoginStep.SYNC_DATA);

      const { syncedToRollup } = this.sdk.getLocalStatus();
      this.handleWorldStateChange(syncedToRollup, nextRollupId - 1);
      this.handleUserStateChange(userId);
      this.sdk.on(SdkEvent.UPDATED_WORLD_STATE, this.handleWorldStateChange);
      this.sdk.on(SdkEvent.UPDATED_USER_STATE, this.handleUserStateChange);

      await this.sdk.awaitUserSynchronised(userId);

      await this.account.init();

      proceed(LoginStep.DONE);
    } catch (e) {
      debug(e);
      if (isValidSdk()) {
        // Show error on screen.
        this.emitSystemMessage(e.message, MessageType.ERROR);
        // TODO - destroy or start from failed step.
      }
    }
  };

  private generateSeedPhrase() {
    const entropy = this.hashToField(Buffer.from(randomString({ length: 64, type: 'base64' })));
    return generateSeedPhrase(entropy);
  }

  private async createAccountFromSeedPhrase(seedPhraseInput: string) {
    const seedPhrase = formatSeedPhraseInput(seedPhraseInput);
    const privateKey = this.hashToField(Buffer.from(seedPhrase));
    const accountPublicKey = this.sdk.derivePublicKey(privateKey);
    return { accountPublicKey, privateKey };
  }

  private async linkAccount() {
    const ethAddress = this.provider.account!;
    const signer = new Web3Signer(this.provider.ethereumProvider);
    const message = this.hashToField(ethAddress.toBuffer());
    const msgHash = utils.keccak256(message);
    const digest = utils.arrayify(msgHash);
    const privateKey = (await signer.signMessage(Buffer.from(digest), ethAddress)).slice(0, 32);
    const accountPublicKey = this.sdk.derivePublicKey(privateKey);
    return { accountPublicKey, privateKey };
  }

  private updateAliasAvailability = async () => {
    const aliasInput = this.loginState.alias;
    const available = await this.isAliasAvailable(aliasInput);
    if (aliasInput !== this.loginState.alias) return;

    this.updateLoginState({ aliasAvailability: available ? ValueAvailability.VALID : ValueAvailability.INVALID });
  };

  private async isAliasAvailable(aliasInput: string) {
    const alias = formatAliasInput(aliasInput);
    return !!alias && !(await this.graphql.getAliasPublicKey(alias));
  }

  private async signIn(userId: AccountId, aliasInput: string) {
    if (!this.isUserAdded(userId)) {
      await this.sdk.addUser(this.signedInAccount!.privateKey, userId.nonce);
    }

    if (!userId.nonce) {
      try {
        const alias = formatAliasInput(aliasInput);
        await this.sdk.createAccount(userId, alias, userId.publicKey);
      } catch (e) {
        debug(e);
        throw new Error(`Failed to create a new account. ${e.message}`);
      }
    }

    if (this.signedInAccount) {
      // User just generated a private key to sign in. Add the user to db or update its last logged in time
      const { accountPublicKey } = this.signedInAccount;
      await this.db.addAccount({ accountPublicKey, alias: aliasInput, timestamp: new Date() });
      const { rememberMe, wallet } = this.loginState;
      if (rememberMe) {
        await this.setLinkedAccountToSession(wallet!, accountPublicKey);
      }
    }

    return new AccountId(userId.publicKey, Math.max(1, userId.nonce));
  }

  private async getLinkedAccountFromSession() {
    const session = Cookie.get(this.sessionCookieName);
    if (!session) return;

    const currentSession = Buffer.from(session, 'hex');
    const { wallet } = this.loginState;
    const accounts = await this.db.getAccounts();
    const now = Date.now();
    const expiresIn = this.config.sessionTimeout * 86400 * 1000;
    for (const account of accounts) {
      const key = await this.generateLoginSessionKey(wallet!, account.accountPublicKey);
      if (key.equals(currentSession) && account.timestamp.getTime() + expiresIn > now) {
        return account;
      }
    }
  }

  private async setLinkedAccountToSession(wallet: Wallet, accountPublicKey: GrumpkinAddress) {
    const sessionKey = this.generateLoginSessionKey(wallet, accountPublicKey);
    Cookie.set(this.sessionCookieName, sessionKey.toString('hex'), { expires: this.config.sessionTimeout });
  }

  private clearSession() {
    Cookie.remove(this.sessionCookieName);
  }

  private generateLoginSessionKey(wallet: Wallet, accountPublicKey: GrumpkinAddress) {
    const idBuf = Buffer.alloc(2);
    idBuf.writeUInt16BE(wallet);
    return this.hashToField(Buffer.concat([idBuf, accountPublicKey.toBuffer()]));
  }

  private bindProviderEvents() {
    this.provider.on(ProviderEvent.UPDATED_NETWORK, this.handleNetworkChange);
    this.provider.on(ProviderEvent.UPDATED_PROVIDER_STATE, (state: ProviderState) =>
      this.emit(UserSessionEvent.UPDATED_PROVIDER_STATE, state),
    );
  }

  private handleNetworkChange = async (network: Network) => {
    if (network.chainId !== this.requiredNetwork.chainId) {
      this.close(
        `You've been logged out because your wallet's network was not on ${this.requiredNetwork.network}.`,
        MessageType.ERROR,
        false,
      );
    }
  };

  private handleWorldStateChange = (syncedToRollup: number, latestRollup: number) => {
    this.updateWorldState({ ...this.worldState, syncedToRollup, latestRollup });
  };

  private handleUserStateChange = (userId: AccountId) => {
    if (!this.account?.userId.equals(userId)) return;

    const user = this.sdk.getUserData(userId);
    this.worldState = { ...this.worldState, accountSyncedToRollup: user.syncedToRollup };
    this.emit(UserSessionEvent.UPDATED_WORLD_STATE, this.worldState);
  };

  private toStep(step: LoginStep, message = '', messageType = MessageType.TEXT) {
    this.updateLoginState({ step });
    this.emitSystemMessage(message, messageType);
  }

  private async abort(message = '', messageType = MessageType.ERROR) {
    const { step } = this.loginState;
    switch (step) {
      case LoginStep.CONNECT_WALLET:
        this.updateLoginState({ wallet: undefined });
        break;
    }
    this.emitSystemMessage(message, messageType);
    this.emit(UserSessionEvent.SESSION_CLOSED);
    await this.destroy();
  }

  private updateWorldState = (worldState: WorldState) => {
    this.worldState = worldState;
    this.emit(UserSessionEvent.UPDATED_WORLD_STATE, worldState);
  };

  private updateLoginState(loginState: Partial<LoginState>) {
    this.loginState = { ...this.loginState, ...loginState };
    this.emit(UserSessionEvent.UPDATED_LOGIN_STATE, this.loginState);
  }

  private clearSystemMessage() {
    this.emitSystemMessage('');
  }

  private emitSystemMessage(message = '', type = MessageType.TEXT) {
    this.emit(UserSessionEvent.UPDATED_SYSTEM_MESSAGE, { message, type });
  }

  private async awaitSdkInitialized(sdk = this.sdk) {
    const sdkInitState = () => sdk.getLocalStatus().initState;
    while (sdkInitState() !== SdkInitState.INITIALIZED) {
      if (sdkInitState() === SdkInitState.DESTROYED) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return true;
  }

  // Remove the ugly workarounds below and make those apis utils that are ready to use without having to initialize the sdk.
  private async ensureUserStates() {
    return new Promise(resolve => {
      const confirmUserStatesUpdated = () => {
        this.sdk.off(SdkEvent.UPDATED_USERS, confirmUserStatesUpdated);
        resolve(true);
      };
      this.sdk.on(SdkEvent.UPDATED_USERS, confirmUserStatesUpdated);
    });
  }

  private hashToField(value: Buffer) {
    return (this.sdk as any).core.blake2s.hashToField(value) as Buffer;
  }

  private async getLocalRollupContractAddress() {
    return (this.sdk as any).core.getRollupContractAddress();
  }

  private isUserAdded(userId: AccountId) {
    try {
      this.sdk.getUserData(userId);
      return true;
    } catch (e) {
      return false;
    }
  }
}
