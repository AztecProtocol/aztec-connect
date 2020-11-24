import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { getProviderStatus, TxHash } from 'barretenberg/rollup_provider';
import createDebug from 'debug';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { EthereumProvider } from 'blockchain';
import { AssetId, SdkEvent } from '../sdk';
import { Web3Signer } from '../signer/web3_signer';
import { EthereumSigner, Signer } from '../signer';
import { deriveGrumpkinPrivateKey, RecoveryPayload, UserData } from '../user';
import { WalletSdk } from '../wallet_sdk';
import { Database, DbAccount, DexieDatabase, SQLDatabase, getOrmConfig } from './database';
import { EthereumSdkUser } from './ethereum_sdk_user';
import { MockTokenContract, TokenContract, Web3TokenContract } from '../token_contract';
import { createConnection } from 'typeorm';
import { EthereumBlockchain } from 'blockchain';
import { createPermitData } from '../wallet_sdk/create_permit_data';

export * from './ethereum_sdk_user';
export * from './ethereum_sdk_user_asset';

const debug = createDebug('bb:ethereum_sdk');

export interface EthUserData extends UserData {
  ethAddress: EthAddress;
}

const toEthUserData = (ethAddress: EthAddress, userData: UserData): EthUserData => ({
  ...userData,
  ethAddress,
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

  const config = {
    networkOrHost: serverUrl,
    console: false,
    gasLimit: 7000000,
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

  public async awaitUserSynchronised(ethAddress: EthAddress, nonce?: number) {
    const userId = this.getUserIdByEthAddress(ethAddress, nonce);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
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

  public getActionState(ethAddress?: EthAddress, nonce?: number) {
    if (!ethAddress) {
      return this.walletSdk.getActionState();
    }

    const userId = this.getUserIdByEthAddress(ethAddress, nonce);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.walletSdk.getActionState(userId);
  }

  public async approve(assetId: AssetId, value: bigint, from: EthAddress): Promise<TxHash> {
    const publicKey = this.getPublicKeyByEthAddress(from);
    if (!publicKey) {
      throw new Error(`User not found: ${from}`);
    }

    return this.walletSdk.approve(assetId, publicKey, value, from);
  }

  public async mint(assetId: AssetId, value: bigint, account: EthAddress): Promise<TxHash> {
    const publicKey = this.getPublicKeyByEthAddress(account);
    if (!publicKey) {
      throw new Error(`User not found: ${account}`);
    }

    return this.walletSdk.mint(assetId, publicKey, value, account);
  }

  public async deposit(
    assetId: AssetId,
    value: bigint,
    from: EthAddress,
    to: GrumpkinAddress,
    signer?: Signer,
    toNonce?: number,
  ): Promise<TxHash> {
    const publicKey = this.getPublicKeyByEthAddress(from);
    if (!publicKey) {
      throw new Error(`User not found: ${from}`);
    }
    const aztecSigner = signer || this.getSchnorrSigner(from);
    const ethSigner = new Web3Signer(this.etherumProvider, from);

    const userPendingDeposit = await this.getUserPendingDeposit(assetId, ethSigner.getAddress());
    const amountToTransfer = value - userPendingDeposit;
    const assetSupportsPermit = await this.getAssetPermitSupport(assetId);

    // Determine if any approval is required.
    const existingAllowance = await this.getTokenContract(assetId).allowance(ethSigner.getAddress());
    const approvalAmount = amountToTransfer - existingAllowance - userPendingDeposit;

    if (approvalAmount > 0) {
      if (assetSupportsPermit) {
        try {
          const deadline = BigInt(300);
          const signature = await this.createPermitSignature(assetId, ethSigner, approvalAmount, deadline);
          const permitArgs = { approvalAmount, deadline, signature };
          return this.walletSdk.deposit(assetId, publicKey, value, aztecSigner, ethSigner, permitArgs, to, toNonce);
        } catch {
          this.emit(SdkEvent.LOG, 'Approving deposit...');
          await this.approve(assetId, approvalAmount, from);
        }
      } else {
        this.emit(SdkEvent.LOG, 'Approving deposit...');
        await this.approve(assetId, approvalAmount, from);
      }
    }

    return this.walletSdk.deposit(assetId, publicKey, value, aztecSigner, ethSigner, undefined, to, toNonce);
  }

  private async createPermitSignature(
    assetId: AssetId,
    ethSigner: EthereumSigner,
    amountToTransfer: bigint,
    permitDeadline: bigint,
  ) {
    const currentTimeInt = parseInt((new Date().getTime() / 1000).toString());
    const deadline = BigInt(currentTimeInt) + permitDeadline;
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
    from: EthAddress,
    to: EthAddress,
    signer?: Signer,
    fromNonce?: number,
  ): Promise<TxHash> {
    const publicKey = this.getPublicKeyByEthAddress(from);
    if (!publicKey) {
      throw new Error(`User not found: ${from}`);
    }

    const aztecSigner = signer || this.getSchnorrSigner(from);
    return this.walletSdk.withdraw(assetId, publicKey, value, aztecSigner, to, fromNonce);
  }

  public async transfer(
    assetId: AssetId,
    value: bigint,
    from: EthAddress,
    to: GrumpkinAddress,
    signer?: Signer,
    fromNonce?: number,
    toNonce?: number,
  ): Promise<TxHash> {
    const publicKey = this.getPublicKeyByEthAddress(from);
    if (!publicKey) {
      throw new Error(`User not found: ${from}`);
    }

    const aztecSigner = signer || this.getSchnorrSigner(from);
    return this.walletSdk.transfer(assetId, publicKey, value, aztecSigner, to, fromNonce, toNonce);
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
    alias: string,
    ethAddress: EthAddress,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ): Promise<TxHash> {
    const publicKey = this.getPublicKeyByEthAddress(ethAddress);
    if (!publicKey) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    return this.walletSdk.createAccount(alias, publicKey, newSigningPublicKey, recoveryPublicKey);
  }

  async recoverAccount(alias: string, recoveryPayload: RecoveryPayload): Promise<TxHash> {
    return this.walletSdk.recoverAccount(alias, recoveryPayload);
  }

  public async migrateAccount(
    alias: string,
    signer: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
    newEthAddress?: EthAddress,
  ): Promise<TxHash> {
    let newAccountPublicKey;
    if (newEthAddress) {
      const ethSigner = new Web3Signer(this.etherumProvider, newEthAddress);
      const privateKey = await deriveGrumpkinPrivateKey(ethSigner);
      newAccountPublicKey = this.walletSdk.derivePublicKey(privateKey);
    }

    return this.walletSdk.migrateAccount(alias, signer, newSigningPublicKey, recoveryPublicKey, newAccountPublicKey);
  }

  async addSigningKeys(
    alias: string,
    signer: Signer,
    signingPublicKey1: GrumpkinAddress,
    signingPublicKey2?: GrumpkinAddress,
    nonce?: number,
  ): Promise<TxHash> {
    return this.walletSdk.addSigningKeys(alias, signer, signingPublicKey1, signingPublicKey2, nonce);
  }

  public async getSigningKeys(alias: string, nonce?: number) {
    return this.walletSdk.getSigningKeys(alias, nonce);
  }

  public getUserData(ethAddress: EthAddress, nonce?: number) {
    const publicKey = this.getPublicKeyByEthAddress(ethAddress);
    if (!publicKey) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    const userData = this.walletSdk.getUserData(publicKey, nonce);
    return userData ? toEthUserData(ethAddress, userData) : undefined;
  }

  public getUsersData() {
    return this.walletSdk.getUsersData().map(userData => {
      const ethAddress = this.getEthAddressByPublicKey(userData.publicKey);
      return toEthUserData(ethAddress, userData);
    });
  }

  public getSchnorrSigner(ethAddress: EthAddress) {
    const userData = this.getUserData(ethAddress)!;
    return this.walletSdk.createSchnorrSigner(userData.privateKey);
  }

  public createSchnorrSigner(privateKey: Buffer) {
    return this.walletSdk.createSchnorrSigner(privateKey);
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
      return new EthereumSdkUser(ethAddress, this, coreUserData.nonce);
    } finally {
      this.resumeEvents();
    }
  }

  public async removeUser(ethAddress: EthAddress, nonce?: number) {
    const publicKey = this.getPublicKeyByEthAddress(ethAddress);
    if (!publicKey) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    await this.db.deleteAccount(ethAddress);
    await this.updateLocalAccounts();
    return this.walletSdk.removeUser(publicKey, nonce);
  }

  public getUser(ethAddress: EthAddress, nonce?: number) {
    const userId = this.getUserIdByEthAddress(ethAddress, nonce);
    return userId ? new EthereumSdkUser(ethAddress, this, userId.nonce) : undefined;
  }

  public getBalance(assetId: AssetId, ethAddress: EthAddress, nonce?: number) {
    const publicKey = this.getPublicKeyByEthAddress(ethAddress);
    if (!publicKey) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.walletSdk.getBalance(assetId, publicKey, nonce);
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

  public async getTx(txHash: Buffer) {
    return this.walletSdk.getTx(txHash);
  }

  public async getUserTxs(ethAddress: EthAddress, nonce?: number) {
    const userId = this.getUserIdByEthAddress(ethAddress, nonce);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
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

  private getUserIdByEthAddress(ethAddress: EthAddress, nonce?: number) {
    const publicKey = this.getPublicKeyByEthAddress(ethAddress);
    if (!publicKey) {
      return undefined;
    }

    return this.walletSdk.getUserId(publicKey, nonce);
  }

  private getEthAddressByPublicKey(publicKey: GrumpkinAddress) {
    const account = this.localAccounts.find(a => a.accountPublicKey.equals(publicKey));
    return account ? account.ethAddress : EthAddress.ZERO;
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
        const ethAddress = this.getEthAddressByPublicKey(userId.publicKey);
        this.emit(event, ethAddress, ...rest, userId.nonce);
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
