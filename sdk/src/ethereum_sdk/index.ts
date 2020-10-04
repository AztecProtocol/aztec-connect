import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { getProviderStatus, TxHash } from 'barretenberg/rollup_provider';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { EthereumProvider } from '../ethereum_provider';
import { AssetId, SdkEvent } from '../sdk';
import { Web3Signer } from '../signer/web3_signer';
import { Signer } from '../signer';
import { deriveGrumpkinPrivateKey, RecoveryPayload, UserData } from '../user';
import { WalletSdk } from '../wallet_sdk';
import { Database, DbAccount } from './database';
import { EthereumSdkUser } from './ethereum_sdk_user';
import { MockTokenContract, TokenContract, Web3TokenContract } from '../token_contract';

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

export async function createEthSdk(ethereumProvider: EthereumProvider, serverUrl: string, sdkOptions: SdkOptions = {}) {
  const status = await getProviderStatus(serverUrl);
  const core = await createSdk(serverUrl, sdkOptions, status, ethereumProvider);
  const db = new Database();
  const { rollupContractAddress, tokenContractAddresses, chainId, networkOrHost } = status;

  // Set erase flag if requested or contract changed.
  if (sdkOptions.clearDb || !(await core.getRollupContractAddress())?.equals(rollupContractAddress)) {
    debug('erasing database');
    await db.clear();
    await core.eraseDb();
  }

  const web3Provider = new Web3Provider(ethereumProvider);
  const { chainId: providerChainId } = await web3Provider.getNetwork();
  if (chainId !== providerChainId) {
    throw new Error(`Provider chainId ${providerChainId} does not match rollup provider chainId ${chainId}.`);
  }

  const tokenContracts: TokenContract[] =
    networkOrHost !== 'development'
      ? tokenContractAddresses.map(a => new Web3TokenContract(web3Provider, a, rollupContractAddress, chainId))
      : [new MockTokenContract()];
  await Promise.all(tokenContracts.map(tc => tc.init()));

  const walletSdk = new WalletSdk(core, tokenContracts);
  return new EthereumSdk(web3Provider, walletSdk, db);
}

export class EthereumSdk extends EventEmitter {
  private localAccounts: DbAccount[] = [];
  private pauseWalletEvents = false;
  private pausedEvents: IArguments[] = [];

  constructor(private web3Provider: Web3Provider, private walletSdk: WalletSdk, private db: Database) {
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

  public async initUserStates() {
    return this.walletSdk.initUserStates();
  }

  public async destroy() {
    await this.walletSdk?.destroy();
    await this.db?.close();
    this.removeAllListeners();
  }

  public async clearData() {
    return this.walletSdk.clearData();
  }

  public async notifiedClearData() {
    return this.walletSdk.notifiedClearData();
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

  public getTokenContract(assetId: AssetId) {
    return this.walletSdk.getTokenContract(assetId);
  }

  public async startReceivingBlocks() {
    return this.walletSdk.startReceivingBlocks();
  }

  public async getAddressFromAlias(alias: string) {
    return this.walletSdk.getAddressFromAlias(alias);
  }

  public async approve(assetId: AssetId, value: bigint, from: EthAddress): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }

    return this.walletSdk.approve(assetId, userId, value, from);
  }

  public async mint(assetId: AssetId, value: bigint, account: EthAddress): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(account);
    if (!userId) {
      throw new Error(`User not found: ${account}`);
    }

    return this.walletSdk.mint(assetId, userId, value, account);
  }

  public async deposit(
    assetId: AssetId,
    value: bigint,
    from: EthAddress,
    to: GrumpkinAddress,
    signer?: Signer,
  ): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }

    const aztecSigner = signer || this.getSchnorrSigner(from);
    const ethSigner = new Web3Signer(this.web3Provider, from);
    return this.walletSdk.deposit(assetId, userId, value, aztecSigner, ethSigner, to);
  }

  public async withdraw(
    assetId: AssetId,
    value: bigint,
    from: EthAddress,
    to: EthAddress,
    signer?: Signer,
  ): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }

    const aztecSigner = signer || this.getSchnorrSigner(from);
    return this.walletSdk.withdraw(assetId, userId, value, aztecSigner, to);
  }

  public async transfer(
    assetId: AssetId,
    value: bigint,
    from: EthAddress,
    to: GrumpkinAddress,
    signer?: Signer,
  ): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }

    const aztecSigner = signer || this.getSchnorrSigner(from);
    return this.walletSdk.transfer(assetId, userId, value, aztecSigner, to);
  }

  public async publicTransfer(
    assetId: AssetId,
    value: bigint,
    from: EthAddress,
    to: EthAddress,
    signer?: Signer,
  ): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }

    const aztecSigner = signer || this.getSchnorrSigner(from);
    const ethSigner = new Web3Signer(this.web3Provider, from);
    return this.walletSdk.publicTransfer(assetId, userId, value, aztecSigner, ethSigner, to);
  }

  public isBusy() {
    return this.walletSdk.isBusy();
  }

  public async generateAccountRecoveryData(ethAddress: EthAddress, trustedThirdPartyPublicKeys: GrumpkinAddress[]) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    return this.walletSdk.generateAccountRecoveryData(userId, trustedThirdPartyPublicKeys);
  }

  public async createAccount(
    ethAddress: EthAddress,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress,
    alias: string,
  ): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    return this.walletSdk.createAccount(userId, newSigningPublicKey, recoveryPublicKey, alias);
  }

  async recoverAccount(ethAddress: EthAddress, recoveryPayload: RecoveryPayload): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    return this.walletSdk.recoverAccount(userId, recoveryPayload);
  }

  async addAlias(ethAddress: EthAddress, alias: string, signer: Signer): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    return this.walletSdk.addAlias(userId, alias, signer);
  }

  async addSigningKey(ethAddress: EthAddress, signingPublicKey: GrumpkinAddress, signer: Signer): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    return this.walletSdk.addSigningKey(userId, signingPublicKey, signer);
  }

  async removeSigningKey(ethAddress: EthAddress, signingPublicKey: GrumpkinAddress, signer: Signer): Promise<TxHash> {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    return this.walletSdk.removeSigningKey(userId, signingPublicKey, signer);
  }

  public async awaitSynchronised() {
    return this.walletSdk.awaitSynchronised();
  }

  public async awaitSettlement(ethAddress: EthAddress, txHash: TxHash, timeout = 120) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.walletSdk.awaitSettlement(userId, txHash, timeout);
  }

  public getUserData(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    const userData = this.walletSdk.getUserData(userId);
    return userData ? toEthUserData(ethAddress, userData) : undefined;
  }

  public getUsersData() {
    return this.walletSdk.getUsersData().map(userData => {
      const ethAddress = this.getEthAddressByUserId(userData.id)!;
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

  public async addUser(ethAddress: EthAddress) {
    const signer = new Web3Signer(this.web3Provider, ethAddress);
    const privateKey = await deriveGrumpkinPrivateKey(signer);
    this.pauseWalletEvents = true;
    try {
      const coreUser = await this.walletSdk.addUser(privateKey);
      await this.db.addAccount({ ethAddress, userId: coreUser.id });
      await this.updateLocalAccounts();
      return new EthereumSdkUser(ethAddress, this);
    } finally {
      this.resumeEvents();
    }
  }

  public async removeUser(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    await this.db.deleteAccount(ethAddress);
    await this.updateLocalAccounts();
    return this.walletSdk.removeUser(userId);
  }

  public getUser(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    return userId ? new EthereumSdkUser(ethAddress, this) : undefined;
  }

  public getBalance(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.walletSdk.getBalance(userId);
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

  public async getUserTxs(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.walletSdk.getUserTxs(userId);
  }

  public async awaitUserSynchronised(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.walletSdk.awaitUserSynchronised(userId);
  }

  public getActionState(ethAddress?: EthAddress) {
    if (!ethAddress) {
      return this.walletSdk.getActionState();
    }

    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.walletSdk.getActionState(userId);
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

  private getUserIdByEthAddress(ethAddress: EthAddress) {
    const ethAddressBuf = ethAddress.toBuffer();
    const account = this.localAccounts.find(a => a.ethAddress.toBuffer().equals(ethAddressBuf));
    return account?.userId;
  }

  private getEthAddressByUserId(userId: Buffer) {
    const account = this.localAccounts.find(a => a.userId.equals(userId));
    return account?.ethAddress;
  }

  private forwardEvent(event: SdkEvent, args: any[]) {
    if (this.pauseWalletEvents) {
      this.pausedEvents.push(arguments);
      return;
    }

    switch (event) {
      case SdkEvent.UPDATED_USER_STATE: {
        const [userId, ...rest] = args;
        const ethAddress = this.getEthAddressByUserId(userId);
        this.emit(event, ethAddress, ...rest);
        break;
      }
      default:
        this.emit(event, ...args);
    }
  }

  private resumeEvents() {
    this.pauseWalletEvents = false;
    this.pausedEvents.forEach(args => this.forwardEvent.apply(this, args as any));
  }
}
