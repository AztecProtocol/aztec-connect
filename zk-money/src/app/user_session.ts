import {
  AccountId,
  AccountProofOutput,
  AssetId,
  createWalletSdk,
  EthersAdapter,
  GrumpkinAddress,
  SdkEvent,
  SdkInitState,
  SettlementTime,
  TxType,
  WalletSdk,
  Web3Signer,
} from '@aztec/sdk';
import { InfuraProvider, Web3Provider } from '@ethersproject/providers';
import randomString from 'crypto-random-string';
import createDebug from 'debug';
import { utils } from 'ethers';
import { EventEmitter } from 'events';
import Cookie from 'js-cookie';
import { debounce, DebouncedFunc } from 'lodash';
import { Config } from '../config';
import { AccountFormEvent, DepositForm, DepositFormValues, DepositStatus } from './account_forms';
import { AccountUtils } from './account_utils';
import { formatAliasInput, getAliasError } from './alias';
import { AppAssetId, assets } from './assets';
import { Database } from './database';
import { MessageType, SystemMessage, ValueAvailability } from './form';
import { GraphQLService } from './graphql_service';
import { Network } from './networks';
import { PriceFeedService } from './price_feed_service';
import { Provider, ProviderEvent, ProviderState, ProviderStatus } from './provider';
import { RollupService } from './rollup_service';
import { formatSeedPhraseInput, generateSeedPhrase, getSeedPhraseError, sliceSeedPhrase } from './seed_phrase';
import { toBaseUnits } from './units';
import { UserAccount, UserAccountEvent } from './user_account';
import { Wallet, wallets } from './wallet_providers';

const debug = createDebug('zm:user_session');

interface SignedInAccount {
  accountPublicKey: GrumpkinAddress;
  privateKey: Buffer;
  nonce: number;
}

export enum LoginStep {
  CONNECT_WALLET,
  SET_SEED_PHRASE,
  SET_ALIAS,
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
  LoginStep.INIT_SDK,
  LoginStep.CREATE_ACCOUNT,
  LoginStep.VALIDATE_DATA,
  LoginStep.RECOVER_ACCOUNT_PROOF,
  LoginStep.ADD_ACCOUNT,
  LoginStep.SYNC_DATA,
];

export interface LoginState {
  step: LoginStep;
  wallet?: Wallet;
  seedPhrase: string;
  alias: string;
  aliasAvailability: ValueAvailability;
  rememberMe: boolean;
  isNewAlias: boolean;
  isNewAccount: boolean;
  allowToProceed: boolean;
}

export const initialLoginState: LoginState = {
  step: LoginStep.CONNECT_WALLET,
  wallet: undefined,
  seedPhrase: '',
  alias: '',
  aliasAvailability: ValueAvailability.INVALID,
  rememberMe: true,
  isNewAlias: false,
  isNewAccount: true,
  allowToProceed: true,
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
  private signedInAccount?: SignedInAccount;
  private loginState = initialLoginState;
  private worldState = initialWorldState;
  private depositForm?: DepositForm;
  private accountUtils!: AccountUtils;
  private account!: UserAccount;
  private debounceCheckAlias: DebouncedFunc<() => void>;
  private destroyed = false;

  private readonly accountProofDepositAsset = AssetId.ETH;
  private readonly accountProofMinDeposit = toBaseUnits('0.01', assets[this.accountProofDepositAsset].decimals);

  private readonly debounceCheckAliasWait = 600;
  private readonly MAX_ACCOUNT_TXS_PER_ROLLUP = 112; // TODO - fetch from server
  private readonly TXS_PER_ROLLUP = 112;

  constructor(
    private config: Config,
    private requiredNetwork: Network,
    private activeAsset: AppAssetId,
    private db: Database,
    private graphql: GraphQLService,
    private sessionCookieName: string,
    private readonly accountProofCacheName: string,
    private readonly walletCacheName: string,
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
      this.clearSession();
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
    await this.removeUnregisteredUsers();
    if (this.sdk) {
      this.sdk.removeAllListeners();
      // Can only safely destroy the sdk after it's fully initialized.
      if (this.sdk.getLocalStatus().initState === SdkInitState.INITIALIZING) {
        await this.awaitSdkInitialized(this.sdk);
      }
      await this.sdk.destroy();
    }
    debug('Session destroyed.');
  }

  connectWallet = async (wallet: Wallet) => {
    if (this.loginState.wallet !== undefined) {
      debug('Duplicated call to connectWallet()');
      return;
    }

    this.updateLoginState({ wallet });

    const walletName = wallets[wallet].name;
    if (wallet !== Wallet.HOT) {
      this.emitSystemMessage(`Connecting to ${walletName}...`);
      await this.changeWallet(wallet);
      if (!this.provider) {
        return this.abort(`Unable to connect to ${walletName}.`);
      }
    }

    this.emitSystemMessage('Connecting to rollup provider...');

    await this.createCoreProvider();

    if (!this.db.isOpen) {
      await this.db.open();
    }

    try {
      await this.createSdk();
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
    await confirmUserStates;

    if (wallet === Wallet.HOT) {
      const seedPhrase = this.generateSeedPhrase();
      this.updateLoginState({ seedPhrase: sliceSeedPhrase(seedPhrase) });
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
          return;
        }
      }
    }

    this.emitSystemMessage('Please sign the message in your wallet to login...', MessageType.WARNING);

    try {
      const account = await this.linkAccount(this.provider!);
      await this.signIn(account);
    } catch (e) {
      debug(e);
      return this.abort('Unable to link your account.');
    }
  };

  changeWallet = async (wallet: Wallet, checkNetwork = true) => {
    if (this.provider?.status === ProviderStatus.INITIALIZING) {
      debug('Cannot change wallet before the current one is initialized or destroyed.');
      return;
    }

    if (wallet === this.provider?.wallet) {
      debug('Reconnecting to the same wallet.');
      await this.provider.destroy();
    }

    const prevProvider = this.provider;
    prevProvider?.removeAllListeners();

    const { infuraId, network, ethereumHost } = this.config;
    this.provider = new Provider(wallet, { infuraId, network, ethereumHost });
    this.provider.on(ProviderEvent.LOG_MESSAGE, (message: string, type: MessageType) =>
      this.emitSystemMessage(message, type),
    );
    this.provider.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.handleProviderStateChange);

    try {
      this.clearWalletSession();
      await this.provider.init(checkNetwork ? this.requiredNetwork : undefined);
      this.saveWalletSession(wallet);
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
      this.updateLoginState({ wallet });
    }
    this.depositForm?.changeProvider(this.provider);
    this.account?.changeProvider(this.provider);
    this.handleProviderStateChange(this.provider?.getState());
  };

  changeAsset = (assetId: AppAssetId) => {
    this.activeAsset = assetId;
    this.account?.changeAsset(assetId);
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

    const account = await this.createAccountFromSeedPhrase(seedPhraseInput);
    await this.signIn(account);
  }

  async forgotAlias() {
    this.updateLoginState({ isNewAlias: true });
    await this.setAlias('');
  }

  async setAlias(aliasInput: string) {
    if (!this.loginState.isNewAlias) {
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
    const { isNewAlias } = this.loginState;
    const error = getAliasError(aliasInput);
    if (error) {
      return this.emitSystemMessage(!isNewAlias ? 'Incorrect username' : error, MessageType.ERROR);
    }

    if (isNewAlias) {
      if (!(await this.isAliasAvailable(aliasInput))) {
        return this.emitSystemMessage('This username has been taken.', MessageType.ERROR);
      }
    } else {
      const alias = formatAliasInput(aliasInput);
      const address = await this.graphql.getAliasPublicKey(alias);
      const { accountPublicKey } = this.signedInAccount!;
      if (!address?.equals(accountPublicKey)) {
        return this.emitSystemMessage('Incorrect username.', MessageType.ERROR);
      }
    }

    await this.toStep(LoginStep.INIT_SDK);
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

    // Add the new user to the sdk so that the accountTx could be added for it.
    // Don't sync from the beginning if it's a new account.
    const userId = proofOutput.tx.userId;
    const { privateKey, nonce } = this.signedInAccount!;
    const noSync = !nonce;
    await this.accountUtils.safeAddUser(privateKey, userId.nonce, noSync);

    try {
      await this.sdk.sendProof(proofOutput);
      this.clearLocalAccountProof();
    } catch (e) {
      debug(e);
      await this.accountUtils.safeRemoveUser(userId);
      this.emitSystemMessage('Failed to send the proof. Please try again later.', MessageType.ERROR);
      return;
    }

    await this.createUserAccount(userId, false);
    await this.updateSession();

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
      const { isNewAlias } = this.loginState;

      if (isNewAlias) {
        proceed(LoginStep.CREATE_ACCOUNT);

        await this.createAccountProof();
        await this.createDepositForm();

        proceed(LoginStep.CLAIM_USERNAME);
      } else {
        proceed(LoginStep.ADD_ACCOUNT);

        const { accountPublicKey, nonce } = this.signedInAccount!;
        const userId = new AccountId(accountPublicKey, nonce);
        await this.createUserAccount(userId, false);

        proceed(LoginStep.SYNC_DATA);

        await this.awaitUserSynchronised(userId);
        if (this.signedInAccount) {
          await this.updateSession();
        }

        proceed(LoginStep.DONE);
      }
    } catch (e) {
      debug(e);
      this.emitSystemMessage(e.message, MessageType.ERROR);
      await this.destroy();
    }
  }

  async backgroundLogin(wallet = Wallet.HOT) {
    if (this.loginState.wallet !== undefined) {
      debug('Attempt to login again.');
      return;
    }

    try {
      this.updateLoginState({ wallet });

      await this.createCoreProvider();

      if (!this.db.isOpen) {
        await this.db.open();
      }

      await this.createSdk();
      if (!(await this.getLocalRollupContractAddress())) {
        throw new Error('Require data reset.');
      }

      const confirmUserStates = this.ensureUserStates();
      // Leave it to run in the background so that it won't block the ui.
      this.sdk.init();

      await confirmUserStates;

      const linkedAccount = await this.getLinkedAccountFromSession();
      if (!linkedAccount) {
        throw new Error('Session data not exists.');
      }

      const { accountPublicKey, alias } = linkedAccount;
      const nonce = this.getLatestLocalNonce(accountPublicKey);
      if (!nonce) {
        await this.db.deleteAccount(accountPublicKey);
        throw new Error('Account not exists.');
      }

      this.updateLoginState({
        alias,
      });

      const userId = new AccountId(accountPublicKey, nonce);
      await this.createUserAccount(userId);

      this.toStep(LoginStep.DONE);
    } catch (e) {
      debug(e);
      await this.close();
    }
  }

  async resumeLogin() {
    const { proofOutput, alias } = this.getLocalAccountProof() || {};
    if (!proofOutput) {
      debug('Local account proof undefined.');
      return;
    }

    this.toStep(LoginStep.VALIDATE_DATA);

    try {
      await this.createCoreProvider();

      if (!this.db.isOpen) {
        await this.db.open();
      }

      await this.createSdk();
      if (!(await this.getLocalRollupContractAddress())) {
        debug('Data reset required.');
        throw new Error('Session expired.');
      }

      const confirmUserStates = this.ensureUserStates();
      this.sdk.init();
      await confirmUserStates;

      this.toStep(LoginStep.RECOVER_ACCOUNT_PROOF);

      const userId = proofOutput.tx.userId;
      const prevUserId = new AccountId(userId.publicKey, userId.nonce - 1);
      if (!this.accountUtils.isUserAdded(prevUserId)) {
        debug('User not added to the sdk.');
        throw new Error('Session expired.');
      }

      if (!(await this.isAliasAvailable(alias))) {
        throw new Error('Username has been taken.');
      }

      const { privateKey, publicKey } = this.sdk.getUserData(prevUserId);
      const accountPublicKey = proofOutput.tx.userId.publicKey;
      const nonce = await this.graphql.getAccountNonce(accountPublicKey);
      this.signedInAccount = { privateKey, accountPublicKey: publicKey, nonce };

      this.updateLoginState({
        alias,
      });

      await this.reviveUserProvider();

      if (nonce > 0 && this.provider?.account && this.provider.chainId === this.requiredNetwork.chainId) {
        const pendingBalance = await this.accountUtils.getPendingBalance(
          this.accountProofDepositAsset,
          this.provider.account,
        );
        if (pendingBalance >= this.accountProofDepositAsset) {
          await this.createUserAccount(userId, false);
          this.toStep(LoginStep.DONE);
          return;
        }
      }

      if (nonce > 0) {
        throw new Error('Account has been registered. Please login with your wallet.');
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
    const wallet = this.getWalletSession();
    if (wallet === undefined || wallet === this.provider?.wallet) return;

    const { infuraId, network, ethereumHost } = this.config;
    const provider = new Provider(wallet, { infuraId, network, ethereumHost });
    if (provider.connected) {
      await this.changeWallet(wallet, false);
    }
  }

  private async createCoreProvider() {
    const { infuraId, network, ethereumHost } = this.config;
    this.coreProvider = new Provider(Wallet.HOT, { infuraId, network, ethereumHost });
    await this.coreProvider.init();
    if (this.coreProvider.chainId !== this.requiredNetwork.chainId) {
      throw new Error(`Wrong network. This shouldn't happen.`);
    }
  }

  private async signIn(account: SignedInAccount) {
    const { accountPublicKey, nonce } = account;
    const allowToProceed = nonce > 0 || (await this.allowNewUser());
    const { alias } = (nonce > 0 && (await this.db.getAccount(accountPublicKey))) || {};
    this.signedInAccount = account;
    this.updateLoginState({ allowToProceed, alias: alias || '', isNewAccount: !nonce, isNewAlias: !nonce });
    this.toStep(alias ? LoginStep.INIT_SDK : LoginStep.SET_ALIAS);
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

  private async createSdk() {
    const { rollupProviderUrl, network, debug, saveProvingKey } = this.config;
    const minConfirmation = network === 'ganache' ? 1 : undefined; // If not ganache, use the default value.
    this.sdk = await createWalletSdk(this.coreProvider.ethereumProvider, rollupProviderUrl, {
      minConfirmation,
      debug,
      saveProvingKey,
    });
    this.rollupService = new RollupService(this.sdk);
    await this.rollupService.init();
    this.accountUtils = new AccountUtils(this.sdk, this.graphql, this.requiredNetwork);
  }

  private async createUserAccount(userId: AccountId, awaitSynchronised = true) {
    if (!userId.nonce) {
      throw new Error('User not registered.');
    }

    if (!this.accountUtils.isUserAdded(userId)) {
      await this.accountUtils.addUser(this.signedInAccount!.privateKey, userId.nonce);
    }

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

    const { nonce, privateKey, publicKey } = this.sdk.getUserData(userId);
    const prevUserId = new AccountId(publicKey, nonce - 1);
    if (!this.accountUtils.isUserAdded(prevUserId) && !(await this.accountUtils.isAccountSettled(userId))) {
      debug(`Adding previous user with nonce ${nonce - 1}.`);
      // We need to use previous acount to send proof before current account is settled.
      await this.accountUtils.addUser(privateKey, nonce - 1);
    }

    await this.account.init(this.provider);
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

  private generateSeedPhrase() {
    const entropy = this.hashToField(Buffer.from(randomString({ length: 64, type: 'base64' })));
    return generateSeedPhrase(entropy);
  }

  private async createAccountFromSeedPhrase(seedPhraseInput: string) {
    const seedPhrase = formatSeedPhraseInput(seedPhraseInput);
    const privateKey = this.hashToField(Buffer.from(seedPhrase));
    return this.createAccountFromPrivateKey(privateKey);
  }

  private async linkAccount(provider: Provider) {
    const ethAddress = provider.account!;
    const web3Provider = new Web3Provider(provider.ethereumProvider);
    const signer = new Web3Signer(web3Provider);
    const message = this.hashToField(ethAddress.toBuffer());
    const msgHash = utils.keccak256(message);
    const digest = utils.arrayify(msgHash);
    const privateKey = (await signer.signMessage(Buffer.from(digest), ethAddress)).slice(0, 32);
    return this.createAccountFromPrivateKey(privateKey);
  }

  private async createAccountFromPrivateKey(privateKey: Buffer) {
    const accountPublicKey = this.sdk.derivePublicKey(privateKey);
    const nonce = await this.graphql.getAccountNonce(accountPublicKey);
    return { accountPublicKey, privateKey, nonce };
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

  private async createAccountProof() {
    const aliasInput = this.loginState.alias;
    const { privateKey } = this.signedInAccount!;
    try {
      await this.removeUnregisteredUsers();
      const userId = await this.accountUtils.safeAddUser(privateKey, 0);
      const alias = formatAliasInput(aliasInput);
      const signer = this.sdk.createSchnorrSigner(privateKey);
      const accountProof = await this.sdk.createAccountProof(userId, signer, alias, 0, true, userId.publicKey);
      this.saveLocalAccountProof(accountProof, alias);
    } catch (e) {
      debug(e);
      throw new Error('Failed to create account proof.');
    }
  }

  private saveLocalAccountProof(accountProof: AccountProofOutput, alias: string) {
    const proofData = accountProof.toBuffer().toString('hex');
    localStorage.setItem(this.accountProofCacheName, JSON.stringify({ alias, proofData }));
  }

  private getLocalAccountProof() {
    const rawData = localStorage.getItem(this.accountProofCacheName);
    if (!rawData) {
      return;
    }

    const account = JSON.parse(rawData);
    return {
      alias: account.alias,
      proofOutput: AccountProofOutput.fromBuffer(Buffer.from(account.proofData, 'hex')),
    };
  }

  private clearLocalAccountProof() {
    localStorage.removeItem(this.accountProofCacheName);
  }

  private saveWalletSession(wallet: Wallet) {
    localStorage.setItem(this.walletCacheName, `${wallet}`);
  }

  private clearWalletSession() {
    localStorage.removeItem(this.walletCacheName);
  }

  private getWalletSession() {
    const session = localStorage.getItem(this.walletCacheName);
    return session ? +session : undefined;
  }

  private async updateSession() {
    if (!this.signedInAccount) {
      debug('Cannot renew session.');
      return;
    }

    const { accountPublicKey } = this.signedInAccount;
    const { alias, rememberMe } = this.loginState;
    await this.db.addAccount({ accountPublicKey, alias, timestamp: new Date() });
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

  private clearSession() {
    Cookie.remove(this.sessionCookieName);
  }

  private generateLoginSessionKey(accountPublicKey: GrumpkinAddress) {
    return this.hashToField(accountPublicKey.toBuffer());
  }

  private async removeUnregisteredUsers() {
    if (!this.sdk) return;

    const users = this.sdk.getUsersData();
    const userZeros = users.filter(u => !u.nonce);
    for (const userZero of userZeros) {
      if (!users.some(u => u.publicKey.equals(userZero.publicKey) && u.nonce > 0)) {
        await this.accountUtils.safeRemoveUser(userZero.id);
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

  private async awaitUserSynchronised(userId: AccountId) {
    const { latestRollup, accountSyncedToRollup } = this.worldState;
    if (accountSyncedToRollup > -1 || latestRollup === -1) {
      await this.sdk.awaitUserSynchronised(userId);
    } else {
      // If sync from rollup 0, sdk.awaitUserSynchronised will resolve immediately.
      while (this.worldState.accountSyncedToRollup < 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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

  private getLatestLocalNonce(publicKey: GrumpkinAddress) {
    const users = this.sdk.getUsersData().filter(u => u.publicKey.equals(publicKey));
    return users.length ? users.reduce((n, { nonce }) => Math.max(n, nonce), 0) : undefined;
  }
}
