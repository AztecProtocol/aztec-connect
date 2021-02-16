import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import createDebug from 'debug';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { EthereumProvider } from 'blockchain';
import { SdkEvent } from '../sdk';
import { AccountId } from '../user';
import { WalletSdk } from '../wallet_sdk';
import { Database, DexieDatabase, SQLDatabase, getOrmConfig } from './database';
import { EthereumSdkUser } from './ethereum_sdk_user';
import { createConnection } from 'typeorm';
import { EthereumBlockchain } from 'blockchain';
import { getBlockchainStatus } from 'barretenberg/service';
import { TxHash } from 'barretenberg/tx_hash';

export * from './ethereum_sdk_user';
export * from './ethereum_sdk_user_asset';

const debug = createDebug('bb:ethereum_sdk');

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
  const { minConfirmation, minConfirmationEHW } = sdkOptions;
  const { rollupContractAddress, chainId } = await getBlockchainStatus(serverUrl);

  const config = {
    console: false,
    gasLimit: 7000000,
    minConfirmation,
    minConfirmationEHW,
  };
  const blockchain = await EthereumBlockchain.new(config, rollupContractAddress, ethereumProvider);

  const core = await createSdk(serverUrl, sdkOptions, blockchain);

  const db = await getDb(sdkOptions.dbPath);
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

  const walletSdk = new WalletSdk(core, blockchain);
  return new EthereumSdk(blockchain, walletSdk, db);
}

export class EthereumSdk extends EventEmitter {
  constructor(private blockchain: EthereumBlockchain, private walletSdk: WalletSdk, private db: Database) {
    super();
  }

  public async init() {
    // Forward all walletSdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.walletSdk.on(event, (...args: any[]) => this.emit(event, ...args));
    }

    await this.walletSdk.init();

    this.emit(SdkEvent.LOG, 'Synching data tree state...');
    const start = new Date().getTime();
    await this.walletSdk.awaitSynchronised();
    const time = (new Date().getTime() - start) / 1000;
    this.emit(SdkEvent.LOG, `Sync took ${time.toFixed(0)} seconds.`);
  }

  public async destroy() {
    await this.walletSdk?.destroy();
    await this.db?.close();
    this.removeAllListeners();
  }

  public isUserSynching(userId: AccountId) {
    return this.walletSdk.isUserSynching(userId);
  }

  public async awaitUserSynchronised(accountId: AccountId) {
    return this.walletSdk.awaitUserSynchronised(accountId);
  }

  public async awaitSynchronised() {
    return this.walletSdk.awaitSynchronised();
  }

  public async awaitSettlement(txHash: TxHash, timeout?: number) {
    return this.walletSdk.awaitSettlement(txHash, timeout);
  }

  public getLocalStatus() {
    return this.walletSdk.getLocalStatus();
  }

  public async getRemoteStatus() {
    return this.walletSdk.getRemoteStatus();
  }

  public async getFee(assetId: AssetId) {
    return this.walletSdk.getFee(assetId);
  }

  public getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return this.walletSdk.getUserPendingDeposit(assetId, account);
  }

  private async getPublicKeyFromAddress(address: EthAddress) {
    const account = await this.db.getAccount(address);
    return account?.accountPublicKey;
  }

  public async isAliasAvailable(alias: string) {
    return this.walletSdk.isAliasAvailable(alias);
  }

  public async approve(assetId: AssetId, accountId: AccountId, value: bigint, ethAddress: EthAddress) {
    return this.walletSdk.approve(assetId, accountId, value, ethAddress);
  }

  public async mint(assetId: AssetId, accountId: AccountId, value: bigint, ethAddress: EthAddress) {
    return this.walletSdk.mint(assetId, accountId, value, ethAddress);
  }

  public async deposit(assetId: AssetId, from: EthAddress, to: AccountId, value: bigint, fee: bigint) {
    const userData = this.walletSdk.getUserData(to);
    const aztecSigner = this.walletSdk.createSchnorrSigner(userData.privateKey);
    return this.walletSdk.deposit(assetId, from, to, value, fee, aztecSigner);
  }

  public async withdraw(assetId: AssetId, from: AccountId, to: EthAddress, value: bigint, fee: bigint) {
    const userData = this.walletSdk.getUserData(from);
    const aztecSigner = this.walletSdk.createSchnorrSigner(userData.privateKey);
    return this.walletSdk.withdraw(assetId, from, value, fee, aztecSigner, to);
  }

  public async transfer(assetId: AssetId, from: AccountId, to: AccountId, value: bigint, fee: bigint) {
    const userData = this.walletSdk.getUserData(from);
    const aztecSigner = this.walletSdk.createSchnorrSigner(userData.privateKey);
    return this.walletSdk.transfer(assetId, from, value, fee, aztecSigner, to);
  }

  public async createAccount(
    accountId: AccountId,
    alias: string,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ) {
    return await this.walletSdk.createAccount(accountId, alias, newSigningPublicKey, recoveryPublicKey);
  }

  public getUserData(accountId: AccountId) {
    return this.walletSdk.getUserData(accountId)!;
  }

  public async getAccountId(aliasOrAddress: string | GrumpkinAddress) {
    return this.walletSdk.getAccountId(aliasOrAddress);
  }

  private async deriveGrumpkinPrivateKey(address: EthAddress) {
    return (await this.blockchain.signMessage(Buffer.from('Link Aztec account.'), address)).slice(0, 32);
  }

  public async addUser(ethAddress: EthAddress) {
    const privateKey = await this.deriveGrumpkinPrivateKey(ethAddress);
    const user = await this.walletSdk.addUser(privateKey);
    await this.db.setAccount({ ethAddress, accountPublicKey: user.getUserData().publicKey });
    return new EthereumSdkUser(ethAddress, user.id, this);
  }

  public async removeUser(address: EthAddress, accountId: AccountId) {
    await this.db.deleteAccount(address);
    return this.walletSdk.removeUser(accountId);
  }

  public async getUser(address: EthAddress) {
    const pubKey = await this.getPublicKeyFromAddress(address);
    if (!pubKey) {
      return;
    }
    const accountId = await this.walletSdk.getAccountId(pubKey);
    return new EthereumSdkUser(address, accountId, this);
  }

  public getBalance(assetId: AssetId, accountId: AccountId) {
    return this.walletSdk.getBalance(assetId, accountId);
  }

  public async getMaxSpendableValue(assetId: AssetId, accountId: AccountId) {
    return this.walletSdk.getMaxSpendableValue(assetId, accountId);
  }

  public async getPublicBalance(assetId: AssetId, ethAddress: EthAddress) {
    return this.walletSdk.getPublicBalance(assetId, ethAddress);
  }

  public async getPublicAllowance(assetId: AssetId, ethAddress: EthAddress) {
    return this.walletSdk.getPublicAllowance(assetId, ethAddress);
  }

  public fromBaseUnits(assetId: AssetId, value: bigint, precision?: number) {
    return this.walletSdk.fromBaseUnits(assetId, value, precision);
  }

  public toBaseUnits(assetId: AssetId, value: string) {
    return this.walletSdk.toBaseUnits(assetId, value);
  }

  public getAssetInfo(assetId: AssetId) {
    return this.walletSdk.getAssetInfo(assetId);
  }

  public async getJoinSplitTxs(accountId: AccountId) {
    return this.walletSdk.getJoinSplitTxs(accountId);
  }

  public async getAccountTxs(accountId: AccountId) {
    return this.walletSdk.getAccountTxs(accountId);
  }

  public async getNotes(accountId: AccountId) {
    return this.walletSdk.getNotes(accountId);
  }
}
