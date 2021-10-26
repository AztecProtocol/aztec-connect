import {
  AccountId,
  AccountProofOutput,
  AssetId,
  createWalletSdk,
  EthAddress,
  EthersAdapter,
  GrumpkinAddress,
  SdkEvent,
  SdkInitState,
  SettlementTime,
  TxType,
  WalletSdk,
} from '@aztec/sdk';
import { InfuraProvider, Web3Provider } from '@ethersproject/providers';
import { createHash } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import Mutex from 'idb-mutex';
import Cookie from 'js-cookie';
import { debounce, DebouncedFunc } from 'lodash';
import { Config } from '../config';
import {
  AccountFormEvent,
  DepositForm,
  DepositFormValues,
  DepositStatus,
  getMigratableValues,
  MigratingAsset,
} from './account_forms';
import { AccountVersion } from './account_state';
import { AccountUtils } from './account_utils';
import { formatAliasInput, getAliasError } from './alias';
import { AppAssetId, assets } from './assets';
import { Database } from './database';
import { MessageType, SystemMessage, ValueAvailability } from './form';
import { GraphQLService } from './graphql_service';
import { createSigningKeys, KeyVault } from './key_vault';
import { Network } from './networks';
import { PriceFeedService } from './price_feed_service';
import { Provider, ProviderEvent, ProviderState, ProviderStatus } from './provider';
import { RollupService } from './rollup_service';
import { toBaseUnits } from './units';
import { UserAccount, UserAccountEvent } from './user_account';
import { WalletId, wallets } from './wallet_providers';

const debug = createDebug('zm:user_session');

export enum LoginMode {
  SIGNUP,
  LOGIN,
  MIGRATE,
  NEW_ALIAS,
}

export enum LoginStep {
  CONNECT_WALLET,
  SET_SEED_PHRASE,
  SET_ALIAS,
  CONFIRM_MIGRATION,
  MIGRATE_WALLET,
  MIGRATE_ACCOUNT,
  SYNC_ACCOUNT,
  MIGRATE_NOTES,
  INIT_SDK,
  CREATE_ACCOUNT,
  VALIDATE_DATA,
  RECOVER_ACCOUNT_PROOF,
  CLAIM_USERNAME,
  ADD_ACCOUNT,
  SYNC_DATA,
  DONE,
}

const undisruptiveSteps = [
  LoginStep.MIGRATE_ACCOUNT,
  LoginStep.SYNC_ACCOUNT,
  LoginStep.MIGRATE_NOTES,
  LoginStep.INIT_SDK,
  LoginStep.CREATE_ACCOUNT,
  LoginStep.VALIDATE_DATA,
  LoginStep.RECOVER_ACCOUNT_PROOF,
  LoginStep.ADD_ACCOUNT,
  LoginStep.SYNC_DATA,
];

export interface LoginState {
  step: LoginStep;
  mode: LoginMode;
  walletId?: WalletId;
  seedPhrase: string;
  alias: string;
  aliasAvailability: ValueAvailability;
  rememberMe: boolean;
  allowToProceed: boolean;
  migratingAssets: MigratingAsset[];
  accountV0?: GrumpkinAddress; // To be deprecated
}

export const initialLoginState: LoginState = {
  step: LoginStep.CONNECT_WALLET,
  mode: LoginMode.SIGNUP,
  walletId: undefined,
  seedPhrase: '',
  alias: '',
  aliasAvailability: ValueAvailability.INVALID,
  rememberMe: true,
  allowToProceed: true,
  migratingAssets: [],
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
  UPDATED_WORLD_STATE = 'UPDATED_WORLD_STATE',
  UPDATED_USER_ACCOUNT_DATA = 'UPDATED_USER_ACCOUNT_DATA',
  UPDATED_DEPOSIT_FORM = 'UPDATED_DEPOSIT_FORM',
  UPDATED_SYSTEM_MESSAGE = 'UPDATED_SYSTEM_MESSAGE',
  SESSION_CLOSED = 'SESSION_CLOSED',
  SESSION_OPEN = 'SESSION_OPEN',
}

export interface UserSession {
  on(event: UserSessionEvent.UPDATED_LOGIN_STATE, listener: (state: LoginState) => void): this;
  on(event: UserSessionEvent.UPDATED_PROVIDER_STATE, listener: (state: ProviderState) => void): this;
  on(event: UserSessionEvent.UPDATED_WORLD_STATE, listener: (state: WorldState) => void): this;
  on(event: UserSessionEvent.UPDATED_USER_ACCOUNT_DATA, listener: () => void): this;
  on(event: UserSessionEvent.UPDATED_SYSTEM_MESSAGE, listener: (message: SystemMessage) => void): this;
  on(event: UserSessionEvent.SESSION_CLOSED, listener: () => void): this;
}

export class UserSession extends EventEmitter {
  private coreProvider!: Provider;
  private provider?: Provider;
  private sdk!: WalletSdk;
  private rollupService!: RollupService;
  private priceFeedService!: PriceFeedService;
  private loginState: LoginState;
  private worldState = initialWorldState;
  private keyVault!: KeyVault;
  private keyVaultV0!: KeyVault;
  private depositForm?: DepositForm;
  private accountUtils!: AccountUtils;
  private account!: UserAccount;
  private activeAsset: AppAssetId;
  private debounceCheckAlias: DebouncedFunc<() => void>;
  private createSdkMutex = new Mutex('create-sdk-mutex');
  private destroyed = false;

  private readonly accountProofTimeout = 60 * 60 * 1000; // 1 hour
  private readonly accountProofDepositAsset = AssetId.ETH;
  private readonly accountProofMinDeposit = toBaseUnits('0.01', assets[this.accountProofDepositAsset].decimals);

  private readonly debounceCheckAliasWait = 600;
  private readonly MAX_ACCOUNT_TXS_PER_ROLLUP = 112; // TODO - fetch from server
  private readonly TXS_PER_ROLLUP = 112;

  constructor(
    private readonly config: Config,
    private readonly requiredNetwork: Network,
    initialActiveAsset: AppAssetId,
    initialLoginMode: LoginMode,
    private readonly db: Database,
    private readonly graphql: GraphQLService,
    private readonly sessionCookieName: string,
    private readonly accountProofCacheName: string,
    private readonly walletCacheName: string,
  ) {
    super();
    this.debounceCheckAlias = debounce(this.updateAliasAvailability, this.debounceCheckAliasWait);
    this.loginState = {
      ...initialLoginState,
      mode: initialLoginMode,
    };
    this.activeAsset = initialActiveAsset;
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

  getDepositForm() {
    return this.depositForm;
  }

  isProcessingAction() {
    return !this.destroyed && (undisruptiveSteps.indexOf(this.loginState.step) >= 0 || !!this.depositForm?.locked);
  }

  isDaiTxFree() {
    return this.rollupService ? !this.rollupService.getFee(AssetId.DAI, TxType.DEPOSIT, SettlementTime.SLOW) : false;
  }

  async close(message = '', messageType = MessageType.TEXT, clearSession = true) {
    this.emitSystemMessage(message, messageType);
    if (clearSession) {
      this.clearLinkedAccountSession();
    }
    this.emit(UserSessionEvent.SESSION_CLOSED);
    await this.destroy();
  }

  async destroy() {
    this.destroyed = true;
    this.removeAllListeners();
    this.debounceCheckAlias.cancel();
    this.account?.destroy();
    this.coreProvider?.destroy();
    this.provider?.destroy();
    this.rollupService?.destroy();
    this.depositForm?.destroy();
    this.priceFeedService?.destroy();
    this.clearLocalAccountProof();
    if (this.sdk && this.sdk.getLocalStatus().initState !== SdkInitState.DESTROYED) {
      this.sdk.removeAllListeners();
      await this.removeUnregisteredUsers();
      // Can only safely destroy the sdk after it's fully initialized.
      if (this.sdk.getLocalStatus().initState === SdkInitState.INITIALIZING) {
        await this.awaitSdkInitialized(this.sdk);
      }
      await this.sdk.destroy();
    }
    debug('Session destroyed.');
  }

  changeLoginMode(mode: LoginMode) {
    this.updateLoginState({ ...initialLoginState, mode });
    this.clearSystemMessage();
  }

  async migrateFromLocalAccountV0(alias: string, accountPublicKey: GrumpkinAddress) {
    this.updateLoginState({ alias, mode: LoginMode.MIGRATE, accountV0: accountPublicKey });
    this.toStep(LoginStep.CONFIRM_MIGRATION);
  }

  async clearLocalAccountV0s() {
    const { accountV0 } = this.loginState;
    if (accountV0) {
      this.updateLoginState({ accountV0: undefined });
    }
    await this.db.deleteAccountV0s();
  }

  async connectWallet(walletId: WalletId) {
    if (this.loginState.walletId !== undefined) {
      debug('Duplicated call to connectWallet()');
      return;
    }

    this.updateLoginState({ walletId });

    const walletName = wallets[walletId].name;
    if (walletId !== WalletId.HOT) {
      this.emitSystemMessage(`Connecting to ${walletName}...`);
      await this.changeWallet(walletId);
      if (!this.provider) {
        return this.abort(`Unable to connect to ${walletName}.`);
      }
    }

    this.emitSystemMessage('Connecting to rollup provider...');

    try {
      await this.createSdk(true);
    } catch (e) {
      return this.abort(`Something went wrong. This shouldn't happen.`);
    }

    if (walletId === WalletId.HOT) {
      return this.toStep(LoginStep.SET_SEED_PHRASE);
    }

    if (this.provider!.chainId !== this.requiredNetwork.chainId) {
      this.emitSystemMessage(
        `Please switch your wallet's network to ${this.requiredNetwork.network}...`,
        MessageType.WARNING,
      );
      while (this.provider!.chainId !== this.requiredNetwork.chainId) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.destroyed) {
          throw new Error('Session destroyed.');
        }
      }
    }

    try {
      const { mode } = this.loginState;
      switch (mode) {
        case LoginMode.SIGNUP:
          await this.signupWithWallet();
          break;
        case LoginMode.LOGIN:
          await this.loginWithWallet();
          break;
        case LoginMode.MIGRATE:
          await this.migrateWithWallet();
          break;
      }
    } catch (e) {
      this.disconnectWallet();
      this.emitSystemMessage(e.message, MessageType.ERROR);
    }
  }

  private async signupWithWallet() {
    this.emitSystemMessage('Please sign the message in your wallet to create a new account...', MessageType.WARNING);

    try {
      this.keyVault = await KeyVault.create(this.provider!, this.sdk);
    } catch (e) {
      debug(e);
      throw new Error('Failed to link your account.');
    }

    const { accountPublicKey } = this.keyVault;
    const nonce = await this.accountUtils.getAccountNonce(accountPublicKey);

    if (!nonce) {
      this.toStep(LoginStep.SET_ALIAS);
    } else {
      // Attempt to sign up with a registered wallet.
      this.updateLoginState({ mode: LoginMode.LOGIN });
      const { alias } = (await this.db.getAccount(accountPublicKey)) || {};
      if (!alias) {
        this.toStep(LoginStep.SET_ALIAS);
      } else {
        // Log in to previously logged in account.
        this.updateLoginState({ alias });
        this.toStep(LoginStep.INIT_SDK);
      }
    }
  }

  private async loginWithWallet() {
    this.emitSystemMessage('Please sign the message in your wallet to login...', MessageType.WARNING);

    try {
      this.keyVault = await KeyVault.create(this.provider!, this.sdk);
    } catch (e) {
      debug(e);
      throw new Error('Unable to link your account.');
    }

    const { accountPublicKey } = this.keyVault;
    const nonce = await this.accountUtils.getAccountNonce(accountPublicKey);

    // Attempt to log in with unknown pubKey.
    if (!nonce) {
      const signingMessage = KeyVault.signingMessageV0(this.provider!.account!, this.sdk).toString('hex');
      this.emitSystemMessage(
        `To check if you have a migratable account, please sign the following hash in your wallet: 0x${signingMessage.slice(
          0,
          6,
        )}...${signingMessage.slice(-4)}`,
        MessageType.WARNING,
      );

      try {
        this.keyVaultV0 = await KeyVault.createV0(this.provider!, this.sdk);
      } catch (e) {
        debug(e);
        throw new Error('Failed to sign the message.');
      }

      const prevNonce = await this.accountUtils.getAccountNonce(this.keyVaultV0.accountPublicKey);
      if (prevNonce) {
        // User has a migratable account.
        const prevAlias = (await this.db.getAccountV0(this.keyVaultV0.accountPublicKey))?.alias || '';
        this.updateLoginState({ alias: prevAlias, mode: LoginMode.MIGRATE });
        this.toStep(prevAlias ? LoginStep.CONFIRM_MIGRATION : LoginStep.SET_ALIAS);
        return;
      }

      // TODO - show a signup link in error message.
      throw new Error('Account not registered.');
    }

    // TODO - different aliases might have the same accountPublicKey
    const { alias } = (await this.db.getAccount(accountPublicKey)) || {};
    if (!alias) {
      this.toStep(LoginStep.SET_ALIAS);
    } else {
      // Log in to previously logged in account.
      this.updateLoginState({ alias });
      this.toStep(LoginStep.INIT_SDK);
    }
  }

  private async migrateWithWallet() {
    const signingMessage = KeyVault.signingMessageV0(this.provider!.account!, this.sdk).toString('hex');
    this.emitSystemMessage(
      `To check if you have a migratable account, please sign the following hash in your wallet: 0x${signingMessage.slice(
        0,
        6,
      )}...${signingMessage.slice(-4)}`,
      MessageType.WARNING,
    );

    try {
      this.keyVaultV0 = await KeyVault.createV0(this.provider!, this.sdk);
    } catch (e) {
      debug(e);
      throw new Error('Failed to sign the message.');
    }

    const nonce = await this.accountUtils.getAccountNonce(this.keyVaultV0.accountPublicKey);
    if (!nonce) {
      throw new Error('Account not found.');
    }

    const { alias } = (await this.db.getAccountV0(this.keyVaultV0.accountPublicKey)) || {};
    if (!alias) {
      this.toStep(LoginStep.SET_ALIAS);
    } else {
      this.updateLoginState({ alias });
      this.toStep(LoginStep.CONFIRM_MIGRATION);
    }
  }

  async changeWallet(walletId: WalletId, checkNetwork = true) {
    if (this.provider?.status === ProviderStatus.INITIALIZING) {
      debug('Cannot change wallet before the current one is initialized or destroyed.');
      return;
    }

    if (walletId === this.provider?.walletId) {
      debug('Reconnecting to the same wallet.');
      await this.provider.destroy();
    }

    const prevProvider = this.provider;
    prevProvider?.removeAllListeners();

    const { infuraId, network, ethereumHost } = this.config;
    this.provider = new Provider(walletId, { infuraId, network, ethereumHost });
    this.provider.on(ProviderEvent.LOG_MESSAGE, (message: string, type: MessageType) =>
      this.emitSystemMessage(message, type),
    );
    this.provider.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.handleProviderStateChange);

    try {
      this.clearWalletSession();
      await this.provider.init(checkNetwork ? this.requiredNetwork : undefined);
      this.saveWalletSession(walletId);
    } catch (e) {
      debug(e);
      await this.provider.destroy();
      this.provider = prevProvider;
    }

    this.clearSystemMessage();
    this.provider?.removeAllListeners();
    this.provider?.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.handleProviderStateChange);
    if (prevProvider !== this.provider) {
      await prevProvider?.destroy();
      this.updateLoginState({ walletId });
    }
    this.depositForm?.changeProvider(this.provider);
    this.account?.changeProvider(this.provider);
    this.handleProviderStateChange(this.provider?.getState());
  }

  async disconnectWallet() {
    await this.provider?.destroy();
    this.clearWalletSession();
    this.provider = undefined;
    this.updateLoginState({ walletId: undefined });
    this.handleProviderStateChange();
  }

  changeAsset(assetId: AppAssetId) {
    this.activeAsset = assetId;
    this.account?.changeAsset(assetId);
  }

  async setSeedPhrase(seedPhrase: string) {
    this.clearSystemMessage();
    return this.updateLoginState({ seedPhrase });
  }

  async confirmSeedPhrase(seedPhraseInput: string) {
    this.keyVaultV0 = KeyVault.fromSeedPhrase(seedPhraseInput, this.sdk);
    const nonce = await this.accountUtils.getAccountNonce(this.keyVaultV0.accountPublicKey);
    if (!nonce) {
      this.emitSystemMessage('Account not found.', MessageType.ERROR);
      return;
    }

    const { alias } = (nonce > 0 && (await this.db.getAccountV0(this.keyVaultV0.accountPublicKey))) || {};
    if (alias) {
      this.updateLoginState({ alias });
      this.toStep(LoginStep.CONFIRM_MIGRATION);
    } else {
      this.toStep(LoginStep.SET_ALIAS);
    }
  }

  forgotAlias() {
    this.updateLoginState({ mode: LoginMode.NEW_ALIAS });
    this.setAlias('');
  }

  setAlias(aliasInput: string) {
    const { mode } = this.loginState;
    const isNewAlias = [LoginMode.SIGNUP, LoginMode.NEW_ALIAS].includes(mode);
    if (!isNewAlias) {
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
  }

  setRememberMe(rememberMe: boolean) {
    this.updateLoginState({ rememberMe });
  }

  async confirmAlias(aliasInput: string) {
    const { mode } = this.loginState;
    const isNewAlias = [LoginMode.SIGNUP, LoginMode.NEW_ALIAS].includes(mode);

    const error = getAliasError(aliasInput);
    if (error) {
      return this.emitSystemMessage(!isNewAlias ? 'Incorrect username.' : error, MessageType.ERROR);
    }

    if (isNewAlias) {
      if (!(await this.accountUtils.isAliasAvailable(aliasInput))) {
        return this.emitSystemMessage('This username has been taken.', MessageType.ERROR);
      }
      const allowToProceed = await this.allowNewUser();
      if (!allowToProceed) {
        this.updateLoginState({ allowToProceed });
        return;
      }
    } else if (this.loginState.seedPhrase) {
      const address = await this.accountUtils.getAliasPublicKey(aliasInput);
      if (!address?.equals(this.keyVaultV0.accountPublicKey)) {
        return this.emitSystemMessage('Incorrect username.', MessageType.ERROR);
      }

      this.toStep(LoginStep.MIGRATE_WALLET);
    } else {
      const address = await this.accountUtils.getAliasPublicKey(aliasInput);
      const keyVault = mode === LoginMode.MIGRATE ? this.keyVaultV0 : this.keyVault;
      if (!address?.equals(keyVault.accountPublicKey)) {
        return this.emitSystemMessage('Incorrect username.', MessageType.ERROR);
      }
    }

    this.toStep(mode === LoginMode.MIGRATE ? LoginStep.CONFIRM_MIGRATION : LoginStep.INIT_SDK);
  }

  async migrateToWallet(walletId: WalletId, reconnect = false) {
    if (!reconnect && this.loginState.walletId !== undefined) {
      debug('Duplicated call to migrateToWallet()');
      return;
    }

    try {
      this.updateLoginState({ walletId });

      const walletName = wallets[walletId].name;
      await this.changeWallet(walletId);
      if (!this.provider) {
        throw new Error(`Unable to connect to ${walletName}.`);
      }

      if (this.provider!.chainId !== this.requiredNetwork.chainId) {
        this.emitSystemMessage(
          `Please switch your wallet's network to ${this.requiredNetwork.network}...`,
          MessageType.WARNING,
        );
        while (this.provider!.chainId !== this.requiredNetwork.chainId) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (this.destroyed) {
            throw new Error('Session destroyed.');
          }
        }
      }

      this.emitSystemMessage('Please sign the message in your wallet to create a new account...', MessageType.WARNING);

      try {
        this.keyVault = await KeyVault.create(this.provider!, this.sdk);
      } catch (e) {
        debug(e);
        throw new Error('Unable to link your account.');
      }

      const nonce = await this.accountUtils.getAccountNonce(this.keyVault.accountPublicKey);
      if (nonce > 0) {
        const signerAddress = this.keyVault.signerAddress.toString();
        throw new Error(
          `An account has been linked to ${signerAddress.slice(0, 6)}...${signerAddress.slice(
            -4,
          )}. Please switch to another address.`,
        );
      }
    } catch (e) {
      this.emitSystemMessage(e.message, MessageType.ERROR);
      await this.disconnectWallet();
      return;
    }

    await this.migrateAccount();
  }

  async migrateAccount() {
    if (!this.sdk) {
      await this.createSdk();
    }

    if (!this.keyVaultV0) {
      if (!this.loginState.accountV0) {
        this.close('Account not found.');
        return;
      }

      const nonce = 1;
      const prevUserId = new AccountId(this.loginState.accountV0, nonce);
      const prevUser = await this.sdk.getUserData(prevUserId);
      this.keyVaultV0 = new KeyVault(prevUser.privateKey, EthAddress.ZERO, this.sdk, AccountVersion.V0);
    }

    if (!this.keyVault) {
      this.toStep(LoginStep.MIGRATE_WALLET);
      const { walletId } = this.loginState;
      if (walletId === WalletId.HOT) {
        await this.disconnectWallet();
      } else if (walletId !== undefined) {
        this.migrateToWallet(walletId, true);
      }
      return;
    }

    this.toStep(LoginStep.MIGRATE_ACCOUNT);

    try {
      await this.confirmAccountKey();
    } catch (e) {
      this.emitSystemMessage(e.message, MessageType.ERROR);
      await this.destroy();
      return;
    }

    try {
      // Add the old account to the sdk.
      const nonce = 1;
      const prevUserId = new AccountId(this.keyVaultV0.accountPublicKey, nonce);
      await this.accountUtils.addUser(this.keyVaultV0.accountPrivateKey, prevUserId.nonce);

      const signingKey = await this.requestSigningKey();

      const signer = this.sdk.createSchnorrSigner(this.keyVaultV0.accountPrivateKey);
      const alias = formatAliasInput(this.loginState.alias);
      await this.awaitUserSynchronised(prevUserId);
      const proof = await this.sdk.createAccountProof(
        prevUserId,
        signer,
        alias,
        nonce,
        true,
        signingKey,
        undefined,
        this.keyVault.accountPrivateKey,
      );

      // Add the user to the sdk so that the account tx could be added to it.
      // Don't sync from the beginning. It's a new account so it doesn't have any txs from previous blocks.
      const userId = new AccountId(this.keyVault.accountPublicKey, nonce + 1);
      await this.accountUtils.addUser(this.keyVault.accountPrivateKey, userId.nonce, true);

      await this.sdk.sendProof(proof);

      await this.db.deleteAccountV0(prevUserId.publicKey);

      this.toStep(LoginStep.SYNC_ACCOUNT);

      await this.syncOldAccount(prevUserId);

      const { migratingAssets } = this.loginState;
      if (migratingAssets.every(a => !a.migratableValues.length)) {
        await this.initUserAccount(userId, false);
        await this.accountUtils.removeUser(prevUserId);
        this.toStep(LoginStep.DONE);
        return;
      }

      const totalFee = migratingAssets.reduce((sum, a) => sum + a.totalFee, 0n);
      if (!totalFee) {
        this.confirmMigrateNotes();
      }
    } catch (e) {
      debug(e);
      this.emitSystemMessage('Failed to migrate account.', MessageType.ERROR);
      await this.destroy();
    }
  }

  async confirmMigrateNotes() {
    this.toStep(LoginStep.MIGRATE_NOTES);

    const nonce = 2;
    const userId = new AccountId(this.keyVault.accountPublicKey, nonce);
    const prevUserId = new AccountId(this.keyVaultV0.accountPublicKey, nonce - 1);
    await this.migrateNotes(prevUserId, userId);
    await this.accountUtils.removeUser(prevUserId);
    await this.initUserAccount(userId, false);

    this.toStep(LoginStep.DONE);
  }

  changeDepositForm(newInputs: Partial<DepositFormValues>) {
    this.depositForm!.changeValues(newInputs);
  }

  async claimUserName() {
    if (!this.depositForm) {
      throw new Error('Deposit form uninitialized.');
    }

    if (this.depositForm.locked) {
      debug('Duplicated call to claimUserName().');
      return;
    }

    await this.depositForm.lock();
    if (!this.depositForm.locked) return;

    await this.depositForm.submit();
    if (this.depositForm.status !== DepositStatus.DONE) return;

    this.depositForm.destroy();

    this.emitSystemMessage(`Sending registration proof...`);

    const { proofOutput } = this.getLocalAccountProof() || {};
    if (!proofOutput) {
      this.emitSystemMessage('Session expired.', MessageType.ERROR);
      return;
    }

    if (!this.provider?.account) {
      this.emitSystemMessage('Wallet disconnected.', MessageType.ERROR);
      return;
    }

    const pendingBalance = await this.accountUtils.getPendingBalance(
      this.accountProofDepositAsset,
      this.provider.account,
    );
    if (pendingBalance < this.accountProofMinDeposit) {
      this.emitSystemMessage('Insufficient deposit.', MessageType.ERROR);
      return;
    }

    // Add the user to the sdk so that the accountTx could be added for it.
    // Need to sync from the beginning when "migrating" account to a new alias.
    const { userId } = proofOutput.tx;
    const noSync = [LoginMode.SIGNUP, LoginMode.MIGRATE].includes(this.loginState.mode);
    await this.accountUtils.addUser(this.keyVault.accountPrivateKey, userId.nonce, noSync);

    try {
      await this.sdk.sendProof(proofOutput);
      this.clearLocalAccountProof();
    } catch (e) {
      debug(e);
      await this.accountUtils.removeUser(userId);
      this.emitSystemMessage('Failed to send the proof. Please try again later.', MessageType.ERROR);
      return;
    }

    await this.initUserAccount(userId, false);

    this.toStep(LoginStep.DONE);

    this.depositForm = undefined;
  }

  async initSdk() {
    if (!(await this.awaitSdkInitialized())) {
      return;
    }

    const proceed = (step: LoginStep) => {
      if (this.sdk.getLocalStatus().initState === SdkInitState.DESTROYED) {
        throw new Error('Sdk destroyed.');
      }

      this.toStep(step);
    };

    try {
      const { mode, alias } = this.loginState;
      const isNewAlias = [LoginMode.SIGNUP, LoginMode.NEW_ALIAS].includes(mode);

      if (isNewAlias) {
        proceed(LoginStep.CREATE_ACCOUNT);

        await this.createAccountProof();
        await this.createDepositForm();

        proceed(LoginStep.CLAIM_USERNAME);
      } else {
        proceed(LoginStep.ADD_ACCOUNT);

        const accountPublicKey = this.keyVault.accountPublicKey;
        const nonce = await this.accountUtils.getAliasNonce(alias);
        const userId = new AccountId(accountPublicKey, nonce);
        await this.initUserAccount(userId, false);

        proceed(LoginStep.SYNC_DATA);

        await this.awaitUserSynchronised(userId);

        proceed(LoginStep.DONE);
      }
    } catch (e) {
      debug(e);
      this.emitSystemMessage(e.message, MessageType.ERROR);
      await this.destroy();
    }
  }

  async backgroundLogin(walletId = WalletId.HOT) {
    if (this.loginState.walletId !== undefined) {
      debug('Attempt to login again.');
      return;
    }

    try {
      this.updateLoginState({ walletId });

      await this.createSdk();

      const linkedAccount = await this.getLinkedAccountFromSession();
      if (!linkedAccount) {
        throw new Error('Account not logged in.');
      }

      const { accountPublicKey, signerAddress, alias, version } = linkedAccount;

      const nonce = await this.accountUtils.getAliasNonce(alias);
      if (!nonce) {
        await this.db.deleteAccount(accountPublicKey);
        throw new Error('Account not registered.');
      }

      const userId = new AccountId(accountPublicKey, nonce);
      const { privateKey } = await this.sdk.getUserData(userId);
      this.keyVault = new KeyVault(privateKey, signerAddress, this.sdk, version);

      this.updateLoginState({
        alias,
      });

      await this.initUserAccount(userId);

      this.toStep(LoginStep.DONE);
    } catch (e) {
      debug(e);
      await this.close();
    }
  }

  async resumeSignup() {
    const { proofOutput, alias, timestamp } = this.getLocalAccountProof() || {};
    if (!proofOutput) {
      debug('Local account proof undefined.');
      await this.close();
      return;
    }

    this.toStep(LoginStep.VALIDATE_DATA);

    try {
      if (Date.now() - timestamp > this.accountProofTimeout) {
        throw new Error('Proof expired.');
      }

      await this.createSdk();

      await this.reviveUserProvider();
      if (!this.provider?.initialized) {
        throw new Error('Wallet disconnected.');
      }
    } catch (e) {
      debug(e);
      this.clearLocalAccountProof();
      // Go back to signup page. Don't show error message.
      await this.close();
      return;
    }

    try {
      this.toStep(LoginStep.RECOVER_ACCOUNT_PROOF);

      this.emitSystemMessage(
        `Please sign the message in your wallet to register username @${alias}...`,
        MessageType.WARNING,
      );
      this.keyVault = await KeyVault.create(this.provider, this.sdk);

      const userId = proofOutput.tx.userId;
      if (!userId.publicKey.equals(this.keyVault.accountPublicKey)) {
        throw new Error('Wallet address does not match the one you used to sign up.');
      }

      this.updateLoginState({
        alias,
      });

      const nonce = await this.accountUtils.getAliasNonce(alias);
      if (nonce > 0 && this.provider?.account && this.provider.chainId === this.requiredNetwork.chainId) {
        const pendingBalance = await this.accountUtils.getPendingBalance(
          this.accountProofDepositAsset,
          this.provider.account,
        );
        if (pendingBalance >= this.accountProofMinDeposit) {
          await this.initUserAccount(userId, false);
          this.clearLocalAccountProof();
          this.toStep(LoginStep.DONE);
          return;
        }
      }

      if (nonce > 0) {
        throw new Error(
          `@${alias} has been taken. Please log in with your wallet or sign up with a different username.`,
        );
      }

      await this.createDepositForm();

      this.toStep(LoginStep.CLAIM_USERNAME);
    } catch (e) {
      debug(e);
      this.clearLocalAccountProof();
      await this.close(e.message, MessageType.ERROR);
    }
  }

  private async reviveUserProvider() {
    const walletId = this.getWalletSession();
    if (walletId === undefined || walletId === this.provider?.walletId) return;

    const { infuraId, network, ethereumHost } = this.config;
    const provider = new Provider(walletId, { infuraId, network, ethereumHost });
    if (provider.connected) {
      await this.changeWallet(walletId, false);
    }
  }

  private async createCoreProvider() {
    const { infuraId, network, ethereumHost } = this.config;
    this.coreProvider = new Provider(WalletId.HOT, { infuraId, network, ethereumHost });
    await this.coreProvider.init();
    if (this.coreProvider.chainId !== this.requiredNetwork.chainId) {
      throw new Error(`Wrong network. This shouldn't happen.`);
    }
  }

  private async createDepositForm() {
    this.depositForm = new DepositForm(
      assets[this.accountProofDepositAsset],
      this.sdk,
      this.coreProvider,
      this.provider,
      this.rollupService,
      this.accountUtils,
      this.requiredNetwork,
      this.config.txAmountLimits[AssetId.ETH],
      this.accountProofMinDeposit,
    );

    for (const e in AccountFormEvent) {
      const event = (AccountFormEvent as any)[e];
      this.depositForm.on(event, () => this.emit(UserSessionEvent.UPDATED_DEPOSIT_FORM));
      this.depositForm.on(AccountFormEvent.UPDATED_FORM_VALUES, (values: DepositFormValues) => {
        const { message, messageType } = values.submit;
        if (message !== undefined) {
          this.emit(UserSessionEvent.UPDATED_SYSTEM_MESSAGE, { message, type: messageType });
        }
      });
    }

    await this.depositForm.init();
  }

  private async createSdk(autoReset = false) {
    await this.createSdkMutex.lock();

    if (this.sdk) {
      return;
    }

    if (!this.coreProvider) {
      await this.createCoreProvider();
    }

    if (!this.db.isOpen) {
      await this.db.open();
    }

    try {
      const { rollupProviderUrl, network, debug, saveProvingKey } = this.config;
      const minConfirmation = network === 'ganache' ? 1 : undefined; // If not ganache, use the default value.
      this.sdk = await createWalletSdk(this.coreProvider.ethereumProvider, rollupProviderUrl, {
        minConfirmation,
        debug,
        saveProvingKey,
      });
      // For testing.
      (window as any).aztec = this.sdk;
    } catch (e) {
      debug(e);
      throw new Error(`Failed to create sdk.`);
    }

    // If local rollupContractAddress is empty, it is a new device or the data just got wiped out.
    if (!(await this.getLocalRollupContractAddress())) {
      if (autoReset) {
        await this.db.clear();
      } else {
        throw new Error('Require data reset.');
      }
    }

    this.rollupService?.destroy();
    this.rollupService = new RollupService(this.sdk);
    await this.rollupService.init();
    this.accountUtils = new AccountUtils(this.sdk, this.graphql, this.requiredNetwork);

    const confirmUserStates = this.ensureUserStates();
    // Leave it to run in the background so that it won't block the ui.
    this.sdk.init();
    await confirmUserStates;

    await this.createSdkMutex.unlock();
  }

  private async initUserAccount(userId: AccountId, awaitSynchronised = true) {
    if (!userId.nonce) {
      throw new Error('User not registered.');
    }

    await this.accountUtils.addUser(this.keyVault.accountPrivateKey, userId.nonce);

    const {
      priceFeedContractAddresses,
      infuraId,
      txAmountLimits,
      withdrawSafeAmounts,
      explorerUrl,
      maxAvailableAssetId,
    } = this.config;
    const provider = new EthersAdapter(new InfuraProvider('mainnet', infuraId));
    const web3Provider = new Web3Provider(provider);
    this.priceFeedService = new PriceFeedService(priceFeedContractAddresses, web3Provider);
    // Leave it to run in the background.
    this.priceFeedService.init();

    await this.reviveUserProvider();

    const { alias } = this.loginState;
    this.account = new UserAccount(
      userId,
      alias,
      this.activeAsset,
      this.keyVault,
      this.sdk,
      this.coreProvider,
      this.db,
      this.rollupService,
      this.priceFeedService,
      this.accountUtils,
      this.requiredNetwork,
      explorerUrl,
      txAmountLimits,
      withdrawSafeAmounts,
      maxAvailableAssetId,
    );

    for (const e in UserAccountEvent) {
      const event = (UserAccountEvent as any)[e];
      this.account.on(event, () => this.emit(UserSessionEvent.UPDATED_USER_ACCOUNT_DATA));
    }

    await this.subscribeToSyncProgress(userId);

    if (awaitSynchronised) {
      await this.awaitUserSynchronised(userId);
    }

    await this.account.init(this.provider);

    await this.updateSession();

    this.emit(UserSessionEvent.SESSION_OPEN);
  }

  private async syncOldAccount(prevUserId: AccountId) {
    await this.awaitUserSynchronised(prevUserId);

    const migratingAssets = await Promise.all(
      assets.map(async ({ id }) => {
        const notes = (await this.sdk.getSpendableNotes(id, prevUserId)).sort((a, b) => (a.value < b.value ? 1 : -1));
        const values = notes.map(n => n.value);
        const fee = await this.sdk.getFee(id, TxType.TRANSFER);
        const migratableValues = getMigratableValues(values, fee);
        return {
          assetId: id,
          fee,
          totalFee: fee * BigInt(Math.ceil(migratableValues.length / 2)),
          values,
          migratableValues,
          migratedValues: [],
        };
      }),
    );
    this.updateLoginState({ migratingAssets });
  }

  private async migrateNotes(prevUserId: AccountId, userId: AccountId) {
    const updateMigratingAssets = (assetId: AppAssetId, migratedValue: bigint) => {
      const migratingAssets = this.loginState.migratingAssets.map(asset => {
        if (asset.assetId !== assetId) {
          return asset;
        }

        const { migratedValues } = asset;
        return {
          ...asset,
          migratedValues: [...migratedValues, migratedValue],
        };
      });
      this.updateLoginState({ migratingAssets });
    };

    const { migratingAssets } = this.loginState;
    const signer = this.sdk.createSchnorrSigner(this.keyVaultV0.accountPrivateKey);
    for (const asset of migratingAssets) {
      const { assetId, fee, migratableValues } = asset;
      for (let i = 0; i < migratableValues.length; i += 2) {
        if (this.destroyed) {
          return;
        }

        const amount = migratableValues.slice(i, i + 2).reduce((sum, value) => sum + value, 0n) - fee;
        // Create private send proof.
        const proof = await this.sdk.createTransferProof(assetId, prevUserId, amount, fee, signer, userId);
        await this.sdk.sendProof(proof);
        await this.db.addMigratingTx({
          ...proof.tx,
          userId,
        });

        updateMigratingAssets(assetId, amount);
      }
    }
  }

  private async subscribeToSyncProgress(userId: AccountId) {
    const {
      blockchainStatus: { nextRollupId },
    } = await this.sdk.getRemoteStatus();
    const { syncedToRollup } = this.sdk.getLocalStatus();
    this.handleWorldStateChange(syncedToRollup, nextRollupId - 1);
    this.handleUserStateChange(userId);
    this.sdk.on(SdkEvent.UPDATED_WORLD_STATE, this.handleWorldStateChange);
    this.sdk.on(SdkEvent.UPDATED_USER_STATE, this.handleUserStateChange);
  }

  private updateAliasAvailability = async () => {
    const aliasInput = this.loginState.alias;
    const nonce = await this.accountUtils.getAliasNonce(aliasInput);
    if (aliasInput !== this.loginState.alias) return;

    this.updateLoginState({
      aliasAvailability: nonce === 0 ? ValueAvailability.VALID : ValueAvailability.INVALID,
    });
  };

  private async createAccountProof() {
    await this.confirmAccountKey();
    const { accountPublicKey, accountPrivateKey } = this.keyVault;
    const nonce = 0;
    const userId = new AccountId(accountPublicKey, nonce);
    try {
      const spendingPublicKey = await this.requestSigningKey();
      const signer = this.sdk.createSchnorrSigner(accountPrivateKey);
      const aliasInput = this.loginState.alias;
      const alias = formatAliasInput(aliasInput);
      await this.accountUtils.addUser(accountPrivateKey, userId.nonce);
      const accountProof = await this.sdk.createAccountProof(userId, signer, alias, 0, true, spendingPublicKey);
      this.saveLocalAccountProof(accountProof, alias);
    } catch (e) {
      debug(e);
      throw new Error('Failed to create account proof.');
    } finally {
      await this.accountUtils.removeUser(userId);
    }
  }

  private async confirmAccountKey() {
    let isSameKey = false;
    try {
      const { signerAddress, accountPublicKey } = this.keyVault;
      while (!this.provider!.account?.equals(signerAddress)) {
        this.emitSystemMessage(
          `Please switch your wallet's account to ${signerAddress
            .toString()
            .slice(0, 6)}...${signerAddress.toString().slice(-4)}.`,
          MessageType.WARNING,
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (this.destroyed) {
          throw new Error('Session destroyed.');
        }
      }

      this.emitSystemMessage(
        'Please sign the message in your wallet to create your Aztec Privacy Key...',
        MessageType.WARNING,
      );
      const newKeyVault = await KeyVault.create(this.provider!, this.sdk);
      isSameKey = accountPublicKey.equals(newKeyVault.accountPublicKey);
    } catch (e) {
      debug(e);
      throw new Error('Failed to create Aztec Privacy Key.');
    } finally {
      this.clearSystemMessage();
    }
    if (!isSameKey) {
      throw new Error(
        `Your wallet doesn't generate deterministic ECDSA signatures. Please retry creating an account with a wallet that does.`,
      );
    }
  }

  private async requestSigningKey() {
    const { signerAddress } = this.keyVault;
    while (!this.provider!.account?.equals(signerAddress)) {
      this.emitSystemMessage(
        `Please switch your wallet's account to ${signerAddress
          .toString()
          .slice(0, 6)}...${signerAddress.toString().slice(-4)}.`,
        MessageType.WARNING,
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.destroyed) {
        throw new Error('Session destroyed.');
      }
    }

    this.emitSystemMessage(
      'Please sign the message in your wallet to create your Aztec Spending Key...',
      MessageType.WARNING,
    );
    const { publicKey } = await createSigningKeys(this.provider!, this.sdk);
    this.clearSystemMessage();
    return publicKey;
  }

  private saveLocalAccountProof(accountProof: AccountProofOutput, alias: string) {
    const proofData = accountProof.toBuffer().toString('hex');
    localStorage.setItem(this.accountProofCacheName, JSON.stringify({ alias, proofData, timestamp: Date.now() }));
  }

  private getLocalAccountProof() {
    const rawData = localStorage.getItem(this.accountProofCacheName);
    if (!rawData) {
      return;
    }

    const { alias, proofData, timestamp } = JSON.parse(rawData);
    return {
      alias,
      proofOutput: AccountProofOutput.fromBuffer(Buffer.from(proofData, 'hex')),
      timestamp,
    };
  }

  private clearLocalAccountProof() {
    localStorage.removeItem(this.accountProofCacheName);
  }

  private saveWalletSession(walletId: WalletId) {
    localStorage.setItem(this.walletCacheName, `${walletId}`);
  }

  private clearWalletSession() {
    localStorage.removeItem(this.walletCacheName);
  }

  private getWalletSession() {
    const session = localStorage.getItem(this.walletCacheName);
    return session ? +session : undefined;
  }

  private async updateSession() {
    const { accountPublicKey, signerAddress, version } = this.keyVault;
    const { alias, rememberMe } = this.loginState;
    await this.db.addAccount({
      accountPublicKey,
      signerAddress,
      alias,
      version,
      timestamp: new Date(),
    });
    if (rememberMe) {
      await this.setLinkedAccountToSession(accountPublicKey);
    }
  }

  private async getLinkedAccountFromSession() {
    const session = Cookie.get(this.sessionCookieName);
    if (!session) return;

    const currentSession = Buffer.from(session, 'hex');
    const accounts = await this.db.getAccounts();
    const now = Date.now();
    const expiresIn = this.config.sessionTimeout * 86400 * 1000;
    for (const account of accounts) {
      const key = await this.generateLoginSessionKey(account.accountPublicKey);
      if (key.equals(currentSession) && account.timestamp.getTime() + expiresIn > now) {
        return account;
      }
    }
  }

  private async setLinkedAccountToSession(accountPublicKey: GrumpkinAddress) {
    const sessionKey = this.generateLoginSessionKey(accountPublicKey);
    Cookie.set(this.sessionCookieName, sessionKey.toString('hex'), { expires: this.config.sessionTimeout });
  }

  private clearLinkedAccountSession() {
    Cookie.remove(this.sessionCookieName);
  }

  private generateLoginSessionKey(accountPublicKey: GrumpkinAddress) {
    return createHash('sha256').update(accountPublicKey.toBuffer()).digest();
  }

  private async removeUnregisteredUsers() {
    const users = this.sdk.getUsersData();
    const userZeros = users.filter(u => !u.nonce);
    for (const userZero of userZeros) {
      if (!users.some(u => u.publicKey.equals(userZero.publicKey) && u.nonce > 0)) {
        await this.accountUtils.removeUser(userZero.id);
      }
    }
  }

  private handleWorldStateChange = (syncedToRollup: number, latestRollup: number) => {
    this.updateWorldState({ ...this.worldState, syncedToRollup, latestRollup });
  };

  private handleUserStateChange = (userId: AccountId) => {
    if (!this.account?.userId.equals(userId)) return;

    const user = this.sdk.getUserData(userId);
    this.worldState = { ...this.worldState, accountSyncedToRollup: user.syncedToRollup };
    this.emit(UserSessionEvent.UPDATED_WORLD_STATE, this.worldState);
  };

  private handleProviderStateChange = (state?: ProviderState) => {
    if (!state || state.status === ProviderStatus.DESTROYED) {
      this.provider = undefined;
      this.depositForm?.changeProvider();
      this.account?.changeProvider();
    }
    this.emit(UserSessionEvent.UPDATED_PROVIDER_STATE, state);
  };

  private toStep(step: LoginStep, message = '', messageType = MessageType.TEXT) {
    this.updateLoginState({ step });
    this.emitSystemMessage(message, messageType);
  }

  private async abort(message = '', messageType = MessageType.ERROR) {
    const { step } = this.loginState;
    switch (step) {
      case LoginStep.CONNECT_WALLET:
        this.updateLoginState({ walletId: undefined });
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

  private async awaitUserSynchronised(userId: AccountId) {
    if (!userId.nonce) {
      return;
    }

    const { latestRollup, accountSyncedToRollup } = this.worldState;
    if (accountSyncedToRollup > -1 || latestRollup === -1) {
      await this.sdk.awaitUserSynchronised(userId);
    } else {
      // If sync from rollup 0, sdk.awaitUserSynchronised will resolve immediately.
      while (this.sdk.getUserData(userId).syncedToRollup < latestRollup) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (this.destroyed) {
          throw new Error('Session destroyed.');
        }
      }
    }
  }

  private async allowNewUser() {
    if (this.MAX_ACCOUNT_TXS_PER_ROLLUP >= this.TXS_PER_ROLLUP) {
      return true;
    }
    const { pendingTxCount } = await this.sdk.getRemoteStatus();
    const unsettledAccountTxs = await this.graphql.getUnsettledAccountTxs();
    const numRollups = Math.max(1, Math.ceil(pendingTxCount / this.TXS_PER_ROLLUP));
    return unsettledAccountTxs.length < numRollups * this.MAX_ACCOUNT_TXS_PER_ROLLUP;
  }

  // Remove the following ugly workarounds.
  private async ensureUserStates() {
    while (!(this.sdk as any).core.userStateFactory) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (this.destroyed) {
        throw new Error('Session destroyed.');
      }
    }
  }

  private async getLocalRollupContractAddress() {
    return (this.sdk as any).core.getRollupContractAddress();
  }
}
