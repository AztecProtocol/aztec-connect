import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { EthereumProvider, EthereumSigner, PermitArgs, TxType } from '@aztec/barretenberg/blockchain';
import { SettlementTime } from '@aztec/barretenberg/rollup_provider';
import { getBlockchainStatus } from '@aztec/barretenberg/service';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { ClientEthereumBlockchain, Web3Signer } from '@aztec/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import { createConnection } from 'typeorm';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { ProofOutput } from '../proofs/proof_output';
import { SdkEvent } from '../sdk';
import { AccountId } from '../user';
import { WalletSdk } from '../wallet_sdk';
import { Database, DexieDatabase, getOrmConfig, SQLDatabase } from './database';
import { EthereumSdkUser } from './ethereum_sdk_user';

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
  const { assets, rollupContractAddress, chainId } = await getBlockchainStatus(serverUrl);

  const core = await createSdk(serverUrl, sdkOptions);

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

  const blockchain = new ClientEthereumBlockchain(rollupContractAddress, assets, ethereumProvider);
  const ethSigner = new Web3Signer(ethereumProvider);
  const walletSdk = new WalletSdk(core, blockchain, ethSigner, sdkOptions);
  return new EthereumSdk(walletSdk, db, ethSigner);
}

export class EthereumSdk extends EventEmitter {
  constructor(private walletSdk: WalletSdk, private db: Database, private ethSigner: EthereumSigner) {
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

  public async getFee(assetId: AssetId, txType: TxType, speed = SettlementTime.SLOW) {
    return this.walletSdk.getFee(assetId, txType, speed);
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

  public async approve(assetId: AssetId, value: bigint, ethAddress: EthAddress) {
    return this.walletSdk.approve(assetId, value, ethAddress);
  }

  public async mint(assetId: AssetId, value: bigint, ethAddress: EthAddress) {
    return this.walletSdk.mint(assetId, value, ethAddress);
  }

  public async depositFundsToContract(
    assetId: AssetId,
    from: EthAddress,
    value: bigint,
    proofHash?: Buffer,
    permitArgs?: PermitArgs,
  ) {
    return this.walletSdk.depositFundsToContract(assetId, from, value, proofHash, permitArgs);
  }

  public async createDepositProof(assetId: AssetId, from: EthAddress, to: AccountId, value: bigint, fee: bigint) {
    const userData = this.walletSdk.getUserData(to);
    const aztecSigner = this.walletSdk.createSchnorrSigner(userData.privateKey);
    return this.walletSdk.createDepositProof(assetId, from, to, value, fee, aztecSigner);
  }

  public async createWithdrawProof(assetId: AssetId, from: AccountId, to: EthAddress, value: bigint, fee: bigint) {
    const userData = this.walletSdk.getUserData(from);
    const aztecSigner = this.walletSdk.createSchnorrSigner(userData.privateKey);
    return this.walletSdk.createWithdrawProof(assetId, from, value, fee, aztecSigner, to);
  }

  public async createTransferProof(assetId: AssetId, from: AccountId, to: AccountId, value: bigint, fee: bigint) {
    const userData = this.walletSdk.getUserData(from);
    const aztecSigner = this.walletSdk.createSchnorrSigner(userData.privateKey);
    return this.walletSdk.createTransferProof(assetId, from, value, fee, aztecSigner, to);
  }

  public async createAccount(
    accountId: AccountId,
    alias: string,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ) {
    return await this.walletSdk.createAccount(accountId, alias, newSigningPublicKey, recoveryPublicKey);
  }

  public async signProof(proofOutput: ProofOutput, inputOwner: EthAddress, provider?: EthereumProvider) {
    return this.walletSdk.signProof(proofOutput, inputOwner, provider);
  }

  public async sendProof(proofOutput: ProofOutput, signature?: Buffer) {
    return this.walletSdk.sendProof(proofOutput, signature);
  }

  public getUserData(accountId: AccountId) {
    return this.walletSdk.getUserData(accountId)!;
  }

  public async getAccountId(aliasOrAddress: string | GrumpkinAddress) {
    return this.walletSdk.getAccountId(aliasOrAddress);
  }

  private async deriveGrumpkinPrivateKey(address: EthAddress) {
    return (await this.ethSigner.signMessage(Buffer.from('Link Aztec account.'), address)).slice(0, 32);
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

  public async getDefiTxs(accountId: AccountId) {
    return this.walletSdk.getDefiTxs(accountId);
  }

  public async getNotes(accountId: AccountId) {
    return this.walletSdk.getNotes(accountId);
  }
}
