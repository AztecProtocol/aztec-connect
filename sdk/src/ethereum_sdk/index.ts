import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/client_proofs';
import { getProviderStatus, TxHash } from 'barretenberg/rollup_provider';
import createDebug from 'debug';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { EthereumProvider } from 'blockchain';
import { SdkEvent } from '../sdk';
import { Web3Signer } from '../signer/web3_signer';
import { EthereumSigner, Signer } from '../signer';
import { AccountId, deriveGrumpkinPrivateKey, RecoveryPayload, UserData } from '../user';
import { WalletSdk, JoinSplitTxOptions } from '../wallet_sdk';
import { Database, DbAccount, DexieDatabase, SQLDatabase, getOrmConfig } from './database';
import { EthereumSdkUser } from './ethereum_sdk_user';
import { MockTokenContract, TokenContract, Web3TokenContract } from '../token_contract';
import { createConnection } from 'typeorm';
import { EthereumBlockchain } from 'blockchain';
import { createPermitData } from '../wallet_sdk/create_permit_data';
import { EthUserId } from './eth_user_id';

export * from './eth_user_id';
export * from './ethereum_sdk_user';
export * from './ethereum_sdk_user_asset';

const debug = createDebug('bb:ethereum_sdk');

export interface EthUserData extends UserData {
  ethUserId: EthUserId;
  ethAddress: EthAddress;
}

const toEthUserData = (ethUserId: EthUserId, userData: UserData): EthUserData => ({
  ...userData,
  ethUserId,
  ethAddress: ethUserId.ethAddress,
});

async function getDb(dbPath = 'data') {
  if (isNode) {
    const config = getOrmConfig(dbPath);
    const connection = await createConnection(config);
    return new SQLDatabase(connection);
  } else {
    return new DexieDatabase();
  }
}

export async function createEthSdk(ethereumProvider: EthereumProvider, serverUrl: string, sdkOptions: SdkOptions = {}) {
  const status = await getProviderStatus(serverUrl);
  const core = await createSdk(serverUrl, sdkOptions, status, ethereumProvider);
  const db = await getDb(sdkOptions.dbPath);
  const { rollupContractAddress, tokenContractAddresses, chainId, networkOrHost } = status;

  await db.init();

  // Set erase flag if requested or contract changed.
  if (sdkOptions.clearDb || !(await core.getRollupContractAddress())?.equals(rollupContractAddress)) {
    debug('erasing database');
    await db.clear();
    await core.eraseDb();
  }

  const provider = new Web3Provider(ethereumProvider);
  const { chainId: providerChainId } = await provider.getNetwork();
  if (chainId !== providerChainId) {
    throw new Error(`Provider chainId ${providerChainId} does not match rollup provider chainId ${chainId}.`);
  }

  const tokenContracts: TokenContract[] =
    networkOrHost !== 'development'
      ? tokenContractAddresses.map(a => new Web3TokenContract(provider, a, rollupContractAddress, chainId))
      : [new MockTokenContract()];

  await Promise.all(tokenContracts.map(tc => tc.init()));

  const { minConfirmation, minConfirmationEHW } = sdkOptions;
  const config = {
    networkOrHost: serverUrl,
    console: false,
    gasLimit: 7000000,
    minConfirmation,
    minConfirmationEHW,
  };
  const blockchain = await EthereumBlockchain.new(config, status.rollupContractAddress, ethereumProvider);

  const walletSdk = new WalletSdk(core, blockchain, tokenContracts);
  return new EthereumSdk(ethereumProvider, walletSdk, db);
}

export class EthereumSdk extends EventEmitter {
  private localAccounts: DbAccount[] = [];
  private pauseWalletEvents = false;
  private pausedEvents: IArguments[] = [];

  constructor(private etherumProvider: EthereumProvider, private walletSdk: WalletSdk, private db: Database) {
    super();
  }

  public async init() {
    await this.updateLocalAccounts();

    // Forward all walletSdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.walletSdk.on(event, (...args: any[]) => this.forwardEvent(event, args));
    }

    await this.walletSdk.init();
  }

  public async destroy() {
    await this.walletSdk?.destroy();
    await this.db?.close();
    this.removeAllListeners();
  }

  public async clearData() {
    return this.walletSdk.clearData();
  }

  public isBusy() {
    return this.walletSdk.isBusy();
  }

  public async awaitSynchronised() {
    return this.walletSdk.awaitSynchronised();
  }

  public async awaitUserSynchronised(ethUserId: EthUserId) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    return this.walletSdk.awaitUserSynchronised(userId);
  }

  public async awaitSettlement(txHash: TxHash, timeout = 120) {
    return this.walletSdk.awaitSettlement(txHash, timeout);
  }

  public isEscapeHatchMode() {
    return this.walletSdk.isEscapeHatchMode();
  }

  public getLocalStatus() {
    return this.walletSdk.getLocalStatus();
  }

  public async getRemoteStatus() {
    return this.walletSdk.getRemoteStatus();
  }

  public getAssetPermitSupport(assetId: AssetId) {
    return this.walletSdk.getAssetPermitSupport(assetId);
  }

  public getTokenContract(assetId: AssetId) {
    return this.walletSdk.getTokenContract(assetId);
  }

  public getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return this.walletSdk.getUserPendingDeposit(assetId, account);
  }

  public getUserNonce(assetId: AssetId, account: EthAddress) {
    return this.walletSdk.getUserNonce(assetId, account);
  }

  public async getAddressFromAlias(alias: string, nonce?: number) {
    return this.walletSdk.getAddressFromAlias(alias, nonce);
  }

  public async getLatestUserNonce(publicKey: GrumpkinAddress) {
    return this.walletSdk.getLatestUserNonce(publicKey);
  }

  public async getLatestAliasNonce(alias: string) {
    return this.walletSdk.getLatestAliasNonce(alias);
  }

  public async isAliasAvailable(alias: string) {
    return this.walletSdk.isAliasAvailable(alias);
  }

  public isUserAdded(ethUserId: EthUserId) {
    try {
      this.getUserData(ethUserId);
      return true;
    } catch (e) {
      return false;
    }
  }

  public getActionState(ethUserId?: EthUserId) {
    if (!ethUserId) {
      return this.walletSdk.getActionState();
    }

    const userId = this.getUserIdFromEthUserId(ethUserId);
    return this.walletSdk.getActionState(userId);
  }

  public async approve(assetId: AssetId, value: bigint, ethUserId: EthUserId) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    return this.walletSdk.approve(assetId, userId, value, ethUserId.ethAddress);
  }

  public async mint(assetId: AssetId, value: bigint, ethUserId: EthUserId) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    return this.walletSdk.mint(assetId, userId, value, ethUserId.ethAddress);
  }

  public async deposit(
    assetId: AssetId,
    value: bigint,
    ethUserId: EthUserId,
    to?: AccountId,
    signer?: Signer,
    options?: JoinSplitTxOptions,
  ) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    const aztecSigner = signer || this.getSchnorrSigner(ethUserId.ethAddress);
    const ethSigner = new Web3Signer(this.etherumProvider, ethUserId.ethAddress);

    const userPendingDeposit = await this.getUserPendingDeposit(assetId, ethSigner.getAddress());
    const amountToTransfer = value - userPendingDeposit;
    const assetSupportsPermit = await this.getAssetPermitSupport(assetId);

    // Determine if any approval is required.
    if (assetId !== AssetId.ETH) {
      const existingAllowance = await this.getTokenContract(assetId).allowance(ethSigner.getAddress());
      const approvalAmount = amountToTransfer - existingAllowance;

      if (approvalAmount > 0) {
        if (assetSupportsPermit) {
          try {
            const currentTimeInt = parseInt((new Date().getTime() / 1000).toString());
            const expireIn = BigInt(300);
            const deadline = BigInt(currentTimeInt) + expireIn;
            const signature = await this.createPermitSignature(assetId, ethSigner, approvalAmount, deadline);
            const permitArgs = { approvalAmount, deadline, signature };
            return this.walletSdk.deposit(assetId, userId, value, aztecSigner, ethSigner, permitArgs, to);
          } catch {
            this.emit(SdkEvent.LOG, 'Approving deposit...');
            await this.approve(assetId, approvalAmount, ethUserId);
          }
        } else {
          this.emit(SdkEvent.LOG, 'Approving deposit...');
          await this.approve(assetId, approvalAmount, ethUserId);
        }
      }
    }

    return this.walletSdk.deposit(assetId, userId, value, aztecSigner, ethSigner, undefined, to, options);
  }

  private async createPermitSignature(
    assetId: AssetId,
    ethSigner: EthereumSigner,
    amountToTransfer: bigint,
    deadline: bigint,
  ) {
    const nonce = await this.walletSdk.getUserNonce(assetId, await ethSigner.getAddress());
    const { rollupContractAddress, chainId } = this.walletSdk.getLocalStatus();
    const tokenContract = await this.walletSdk.getTokenContract(assetId);
    const tokenName = await this.walletSdk.getTokenContract(assetId).name();

    const permitData = createPermitData(
      tokenName,
      ethSigner.getAddress(),
      rollupContractAddress,
      amountToTransfer,
      nonce,
      deadline,
      chainId,
      tokenContract.getAddress(),
    );

    return ethSigner.signTypedData(permitData);
  }

  public async withdraw(
    assetId: AssetId,
    value: bigint,
    ethUserId: EthUserId,
    to: EthAddress,
    signer?: Signer,
    options?: JoinSplitTxOptions,
  ) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    const aztecSigner = signer || this.getSchnorrSigner(ethUserId.ethAddress);
    const txOptions = { ...(options || {}) };
    if (txOptions.txFee && !txOptions.payTxFeeByPrivateAsset && !txOptions.feePayer) {
      txOptions.feePayer = new Web3Signer(this.etherumProvider, ethUserId.ethAddress);
    }

    return this.walletSdk.withdraw(assetId, userId, value, aztecSigner, to, txOptions);
  }

  public async transfer(
    assetId: AssetId,
    value: bigint,
    ethUserId: EthUserId,
    to: AccountId,
    signer?: Signer,
    options?: JoinSplitTxOptions,
  ) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    const aztecSigner = signer || this.getSchnorrSigner(ethUserId.ethAddress);
    const txOptions = { ...(options || {}) };
    if (txOptions.txFee && !txOptions.payTxFeeByPrivateAsset && !txOptions.feePayer) {
      txOptions.feePayer = new Web3Signer(this.etherumProvider, ethUserId.ethAddress);
    }

    return this.walletSdk.transfer(assetId, userId, value, aztecSigner, to, txOptions);
  }

  public async generateAccountRecoveryData(
    alias: string,
    ethAddress: EthAddress,
    trustedThirdPartyPublicKeys: GrumpkinAddress[],
    nonce?: number,
  ) {
    const publicKey = this.getPublicKeyByEthAddress(ethAddress);
    if (!publicKey) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    return this.walletSdk.generateAccountRecoveryData(alias, publicKey, trustedThirdPartyPublicKeys, nonce);
  }

  public async createAccount(
    ethUserId: EthUserId,
    alias: string,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    return this.walletSdk.createAccount(userId, alias, newSigningPublicKey, recoveryPublicKey);
  }

  async recoverAccount(recoveryPayload: RecoveryPayload) {
    return this.walletSdk.recoverAccount(recoveryPayload);
  }

  public async migrateAccount(
    ethUserId: EthUserId,
    signer: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
    newEthAddress?: EthAddress,
  ) {
    const userId = this.getUserIdFromEthUserId(ethUserId);

    let newAccountPublicKey;
    if (newEthAddress) {
      const ethSigner = new Web3Signer(this.etherumProvider, newEthAddress);
      const privateKey = await deriveGrumpkinPrivateKey(ethSigner);
      newAccountPublicKey = this.walletSdk.derivePublicKey(privateKey);
    }

    return this.walletSdk.migrateAccount(userId, signer, newSigningPublicKey, recoveryPublicKey, newAccountPublicKey);
  }

  async addSigningKeys(
    ethUserId: EthUserId,
    signer: Signer,
    signingPublicKey1: GrumpkinAddress,
    signingPublicKey2?: GrumpkinAddress,
  ) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    return this.walletSdk.addSigningKeys(userId, signer, signingPublicKey1, signingPublicKey2);
  }

  public async getSigningKeys(ethUserId: EthUserId) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    return this.walletSdk.getSigningKeys(userId);
  }

  public getUserData(ethUserId: EthUserId) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    const userData = this.walletSdk.getUserData(userId)!;
    return toEthUserData(ethUserId, userData);
  }

  public getUsersData() {
    return this.walletSdk.getUsersData().map(userData => {
      const ethUserId = this.getEthUserIdByUserId(userData.id);
      return toEthUserData(ethUserId, userData);
    });
  }

  public getSchnorrSigner(ethAddress: EthAddress) {
    const userData = this.getUserData(new EthUserId(ethAddress, 0))!;
    if (!userData) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    return this.walletSdk.createSchnorrSigner(userData.privateKey);
  }

  public createSchnorrSigner(privateKey: Buffer) {
    return this.walletSdk.createSchnorrSigner(privateKey);
  }

  public async getAccountId(user: string | GrumpkinAddress, nonce?: number) {
    return this.walletSdk.getAccountId(user, nonce);
  }

  public async addUser(ethAddress: EthAddress, nonce?: number) {
    const ethSigner = new Web3Signer(this.etherumProvider, ethAddress);
    const privateKey = await deriveGrumpkinPrivateKey(ethSigner);
    this.pauseWalletEvents = true;
    try {
      const coreUser = await this.walletSdk.addUser(privateKey, nonce);
      const coreUserData = coreUser.getUserData();
      const latestAccount = await this.db.getAccount(ethAddress);
      if (!latestAccount) {
        await this.db.addAccount({ ethAddress, accountPublicKey: coreUserData.publicKey });
      }
      await this.updateLocalAccounts();
      const ethUserId = new EthUserId(ethAddress, coreUserData.nonce);
      return new EthereumSdkUser(ethUserId, this);
    } finally {
      this.resumeEvents();
    }
  }

  public async removeUser(ethUserId: EthUserId) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    await this.db.deleteAccount(ethUserId.ethAddress);
    await this.updateLocalAccounts();
    return this.walletSdk.removeUser(userId);
  }

  public getUser(ethUserId: EthUserId) {
    const userData = this.getUserData(ethUserId);
    if (!userData) {
      throw new Error(`User not found: ${ethUserId}`);
    }

    return new EthereumSdkUser(ethUserId, this);
  }

  public getBalance(assetId: AssetId, ethUserId: EthUserId) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    return this.walletSdk.getBalance(assetId, userId);
  }

  public async getPublicBalance(assetId, ethAddress: EthAddress) {
    return this.walletSdk.getPublicBalance(assetId, ethAddress);
  }

  public async getPublicAllowance(assetId, ethAddress: EthAddress) {
    return this.walletSdk.getPublicAllowance(assetId, ethAddress);
  }

  public async getLatestRollups(count: number) {
    return this.walletSdk.getLatestRollups(count);
  }

  public async getLatestTxs(count: number) {
    return this.walletSdk.getLatestTxs(count);
  }

  public async getRollupFromId(rollupId: number) {
    return this.walletSdk.getRollup(rollupId);
  }

  public async getTx(txHash: TxHash) {
    return this.walletSdk.getTx(txHash);
  }

  public async getUserTxs(ethUserId: EthUserId) {
    const userId = this.getUserIdFromEthUserId(ethUserId);
    return this.walletSdk.getUserTxs(userId);
  }

  public startTrackingGlobalState() {
    return this.walletSdk.startTrackingGlobalState();
  }

  public stopTrackingGlobalState() {
    return this.walletSdk.stopTrackingGlobalState();
  }

  private async updateLocalAccounts() {
    this.localAccounts = await this.db.getAccounts();
  }

  private getPublicKeyByEthAddress(ethAddress: EthAddress) {
    const ethAddressBuf = ethAddress.toBuffer();
    const account = this.localAccounts.find(a => a.ethAddress.toBuffer().equals(ethAddressBuf));
    return account?.accountPublicKey;
  }

  private getEthUserIdByUserId(userId: AccountId) {
    const account = this.localAccounts.find(a => a.accountPublicKey.equals(userId.publicKey));
    return account ? new EthUserId(account.ethAddress, userId.nonce) : new EthUserId(EthAddress.ZERO, userId.nonce); // account will be empty if the user is added through wallet sdk.
  }

  private getUserIdFromEthUserId(ethUserId: EthUserId) {
    const publicKey = this.getPublicKeyByEthAddress(ethUserId.ethAddress);
    if (!publicKey) {
      throw new Error(`User not found: ${ethUserId}`);
    }

    return new AccountId(publicKey, ethUserId.nonce);
  }

  private forwardEvent(event: SdkEvent, args: any[]) {
    if (this.pauseWalletEvents) {
      // eslint-disable-next-line
      this.pausedEvents.push(arguments);
      return;
    }

    switch (event) {
      case SdkEvent.UPDATED_USER_STATE: {
        const [userId, ...rest] = args;
        const ethUserId = this.getEthUserIdByUserId(userId);
        this.emit(event, ethUserId, ...rest, userId);
        break;
      }
      default:
        this.emit(event, ...args);
    }
  }

  private resumeEvents() {
    this.pauseWalletEvents = false;
    // eslint-disable-next-line
    this.pausedEvents.forEach(args => this.forwardEvent.apply(this, args as any));
  }
}
