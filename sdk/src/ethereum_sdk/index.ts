import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { TxHash } from 'barretenberg/rollup_provider';
import createDebug from 'debug';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { EthereumProvider } from 'blockchain';
import { SdkEvent } from '../sdk';
import { Web3Signer } from '../signer/web3_signer';
import { EthereumSigner } from '../signer';
import { AccountId, deriveGrumpkinPrivateKey } from '../user';
import { WalletSdk } from '../wallet_sdk';
import { Database, DexieDatabase, SQLDatabase, getOrmConfig } from './database';
import { EthereumSdkUser } from './ethereum_sdk_user';
import { MockTokenContract, TokenContract, Web3TokenContract } from '../token_contract';
import { createConnection } from 'typeorm';
import { EthereumBlockchain } from 'blockchain';
import { createPermitData } from '../wallet_sdk/create_permit_data';
import { getBlockchainStatus, getServiceName } from 'barretenberg/service';

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
  const serviceName = await getServiceName(serverUrl);
  const status = await getBlockchainStatus(serverUrl);
  const core = await createSdk(serverUrl, sdkOptions, serviceName, status, ethereumProvider);
  const db = await getDb(sdkOptions.dbPath);
  const { rollupContractAddress, assets, chainId, networkOrHost } = status;

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
      ? assets.slice(1).map(a => new Web3TokenContract(provider, a.address, rollupContractAddress, chainId))
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
  private pauseWalletEvents = false;
  private pausedEvents: IArguments[] = [];

  constructor(private etherumProvider: EthereumProvider, private walletSdk: WalletSdk, private db: Database) {
    super();
  }

  public async init() {
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

  public async awaitUserSynchronised(accountId: AccountId) {
    return this.walletSdk.awaitUserSynchronised(accountId);
  }

  public async awaitSettlement(txHash: TxHash, timeout?: number) {
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

  public async getFee(assetId: AssetId) {
    return this.walletSdk.getFee(assetId);
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

  private async getPublicKeyFromAddress(address: EthAddress) {
    const account = await this.db.getAccount(address);
    return account?.accountPublicKey;
  }

  public async getLatestUserNonce(address: EthAddress) {
    const publicKey = await this.getPublicKeyFromAddress(address);
    return publicKey ? this.walletSdk.getLatestUserNonce(publicKey) : 0;
  }

  public async getLatestAliasNonce(alias: string) {
    return this.walletSdk.getLatestAliasNonce(alias);
  }

  public async isAliasAvailable(alias: string) {
    return this.walletSdk.isAliasAvailable(alias);
  }

  public getActionState(accountId?: AccountId) {
    return this.walletSdk.getActionState(accountId);
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
    const ethSigner = new Web3Signer(this.etherumProvider, from);

    // Determine if any approval is required.
    if (assetId !== AssetId.ETH) {
      const userPendingDeposit = await this.getUserPendingDeposit(assetId, ethSigner.getAddress());
      const amountToTransfer = value + fee - userPendingDeposit;
      const existingAllowance = await this.getTokenContract(assetId).allowance(ethSigner.getAddress());
      const approvalAmount = amountToTransfer - existingAllowance;

      if (approvalAmount > 0) {
        const assetSupportsPermit = await this.getAssetPermitSupport(assetId);
        if (assetSupportsPermit) {
          const currentTimeInt = parseInt((new Date().getTime() / 1000).toString());
          const expireIn = BigInt(300);
          const deadline = BigInt(currentTimeInt) + expireIn;
          const signature = await this.createPermitSignature(assetId, ethSigner, approvalAmount, deadline);
          const permitArgs = { approvalAmount, deadline, signature };
          return this.walletSdk.deposit(assetId, to, value, fee, aztecSigner, ethSigner, permitArgs);
        }

        this.emit(SdkEvent.LOG, 'Approving deposit...');
        await this.approve(assetId, to, approvalAmount, from);
      }
    }

    return this.walletSdk.deposit(assetId, to, value, fee, aztecSigner, ethSigner);
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
    const permitData = createPermitData(
      tokenContract.getName(),
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
    ethAddress: EthAddress,
    alias: string,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ) {
    const txHash = await this.walletSdk.createAccount(accountId, alias, newSigningPublicKey, recoveryPublicKey);
    await this.db.addAccount({ ethAddress: ethAddress, accountPublicKey: accountId.publicKey });
    return txHash;
  }

  public getUserData(accountId: AccountId) {
    return this.walletSdk.getUserData(accountId)!;
  }

  public async getAccountIdFromAddress(address: EthAddress, nonce?: number) {
    const pubKey = await this.getPublicKeyFromAddress(address);
    if (!pubKey) {
      return;
    }
    const n = nonce || (await this.walletSdk.getLatestUserNonce(pubKey));
    return this.walletSdk.getUserId(pubKey, n);
  }

  public async getAccountId(user: string | GrumpkinAddress, nonce?: number) {
    return this.walletSdk.getAccountId(user, nonce);
  }

  public async addUser(ethAddress: EthAddress, nonce?: number) {
    const ethSigner = new Web3Signer(this.etherumProvider, ethAddress);
    const privateKey = await deriveGrumpkinPrivateKey(ethSigner);
    this.pauseWalletEvents = true;
    try {
      const user = await this.walletSdk.addUser(privateKey, nonce);
      const userData = user.getUserData();
      const latestAccount = await this.db.getAccount(ethAddress);
      if (!latestAccount) {
        await this.db.addAccount({ ethAddress, accountPublicKey: userData.publicKey });
      }
      return new EthereumSdkUser(ethAddress, user.id, this);
    } finally {
      this.resumeEvents();
    }
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
    const nonce = await this.walletSdk.getLatestUserNonce(pubKey);
    const accountId = this.walletSdk.getUserId(pubKey, nonce);
    return new EthereumSdkUser(address, accountId, this);
  }

  public getBalance(assetId: AssetId, accountId: AccountId) {
    return this.walletSdk.getBalance(assetId, accountId);
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

  public getAssetName(assetId: AssetId) {
    return this.walletSdk.getAssetName(assetId);
  }

  public getAssetSymbol(assetId: AssetId) {
    return this.walletSdk.getAssetSymbol(assetId);
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

  private forwardEvent(event: SdkEvent, args: any[]) {
    if (this.pauseWalletEvents) {
      // eslint-disable-next-line
      this.pausedEvents.push(arguments);
      return;
    }

    this.emit(event, ...args);
  }

  private resumeEvents() {
    this.pauseWalletEvents = false;
    // eslint-disable-next-line
    this.pausedEvents.forEach(args => this.forwardEvent.apply(this, args as any));
  }
}
