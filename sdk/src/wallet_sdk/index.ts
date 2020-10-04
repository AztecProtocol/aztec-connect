import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { Signature } from 'barretenberg/client_proofs/signature';
import { getProviderStatus, Rollup, Tx, TxHash } from 'barretenberg/rollup_provider';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { CoreSdk } from '../core_sdk/core_sdk';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { EthereumProvider } from '../ethereum_provider';
import { Action, ActionState, AssetId, SdkEvent, SdkInitState } from '../sdk';
import { EthereumSigner, RecoverSignatureSigner, Signer } from '../signer';
import { MockTokenContract, TokenContract, Web3TokenContract } from '../token_contract';
import { RecoveryPayload } from '../user';
import { WalletSdkUser } from './wallet_sdk_user';

export * from './wallet_sdk_user';
export * from './wallet_sdk_user_asset';

const debug = createDebug('bb:wallet_sdk');

export async function createWalletSdk(
  ethereumProvider: EthereumProvider,
  serverUrl: string,
  sdkOptions: SdkOptions = {},
) {
  const status = await getProviderStatus(serverUrl);
  const core = await createSdk(serverUrl, sdkOptions, status, ethereumProvider);
  const { rollupContractAddress, tokenContractAddresses, chainId, networkOrHost } = status;

  // Set erase flag if requested or contract changed.
  if (sdkOptions.clearDb || !(await core.getRollupContractAddress())?.equals(rollupContractAddress)) {
    debug('erasing database');
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

  return new WalletSdk(core, tokenContracts);
}

export interface WalletSdk {
  on(event: SdkEvent.UPDATED_ACTION_STATE, listener: (actionState: ActionState) => void): this;
  on(event: SdkEvent.UPDATED_EXPLORER_ROLLUPS, listener: (rollups: Rollup[]) => void): this;
  on(event: SdkEvent.UPDATED_EXPLORER_TXS, listener: (txs: Tx[]) => void): this;
  on(event: SdkEvent.UPDATED_INIT_STATE, listener: (initState: SdkInitState, message?: string) => void): this;
  on(event: SdkEvent.UPDATED_USERS, listener: () => void): this;
  on(event: SdkEvent.UPDATED_USER_STATE, listener: (userId: Buffer) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (rollupId: number, latestRollupId: number) => void): this;
}

export class WalletSdk extends EventEmitter {
  constructor(private core: CoreSdk, private tokenContracts: TokenContract[]) {
    super();
  }

  public async init() {
    // Forward all core sdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.core.on(event, (...args: any[]) => this.emit(event, ...args));
    }

    await this.core.init();
  }

  public async destroy() {
    await this.core?.destroy();
    this.removeAllListeners();
  }

  public async clearData() {
    return this.core.clearData();
  }

  public isBusy() {
    return this.core.isBusy();
  }

  public async awaitSynchronised() {
    return this.core.awaitSynchronised();
  }

  public async awaitUserSynchronised(userId: Buffer) {
    return this.core.awaitUserSynchronised(userId);
  }

  public async awaitSettlement(userId: Buffer, txHash: TxHash, timeout = 120) {
    return this.core.awaitSettlement(userId, txHash, timeout);
  }

  public isEscapeHatchMode() {
    return this.core.isEscapeHatchMode();
  }

  public getLocalStatus() {
    return this.core.getLocalStatus();
  }

  public async getRemoteStatus() {
    return this.core.getRemoteStatus();
  }

  public getTokenContract(assetId: AssetId) {
    return this.tokenContracts[assetId];
  }

  public async getAddressFromAlias(alias: string) {
    return this.core.getAddressFromAlias(alias);
  }

  public getActionState(userId?: Buffer) {
    return this.core.getActionState(userId);
  }

  public async approve(assetId: AssetId, userId: Buffer, value: bigint, account: EthAddress): Promise<TxHash> {
    const action = () => this.getTokenContract(assetId).approve(value, account);
    const { rollupContractAddress } = this.core.getLocalStatus();
    const txHash = await this.core.performAction(Action.APPROVE, value, userId, rollupContractAddress, action);
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  public async mint(assetId: AssetId, userId: Buffer, value: bigint, account: EthAddress): Promise<TxHash> {
    const action = () => this.getTokenContract(assetId).mint(value, account);
    const txHash = await this.core.performAction(Action.MINT, value, userId, account, action);
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  public async deposit(
    assetId: AssetId,
    userId: Buffer,
    value: bigint,
    signer: Signer,
    ethSigner: EthereumSigner,
    to?: GrumpkinAddress | string,
  ): Promise<TxHash> {
    const recipient = !to
      ? this.getUserData(userId)!.publicKey
      : typeof to === 'string'
      ? await this.getAddressFromAlias(to)
      : to;
    const action = () =>
      this.core.createProof(assetId, userId, 'DEPOSIT', value, signer, ethSigner, recipient, undefined);
    const validation = async () => {
      if (!recipient) {
        throw new Error(`No address found for alias: ${to}`);
      }
      const account = await ethSigner.getAddress();
      return this.checkPublicBalanceAndAllowance(assetId, value, account);
    };
    return this.core.performAction(Action.DEPOSIT, value, userId, to || recipient!, action, validation);
  }

  public async withdraw(
    assetId: AssetId,
    userId: Buffer,
    value: bigint,
    signer: Signer,
    to: EthAddress,
  ): Promise<TxHash> {
    const action = () => this.core.createProof(assetId, userId, 'WITHDRAW', value, signer, undefined, undefined, to);
    return this.core.performAction(Action.WITHDRAW, value, userId, to, action);
  }

  public async transfer(
    assetId: AssetId,
    userId: Buffer,
    value: bigint,
    signer: Signer,
    to: GrumpkinAddress | string,
  ): Promise<TxHash> {
    const recipient = typeof to === 'string' ? await this.getAddressFromAlias(to) : to;
    const action = () => this.core.createProof(assetId, userId, 'TRANSFER', value, signer, undefined, recipient);
    return this.core.performAction(Action.TRANSFER, value, userId, to, action);
  }

  public async publicTransfer(
    assetId: AssetId,
    userId: Buffer,
    value: bigint,
    signer: Signer,
    ethSigner: EthereumSigner,
    to: EthAddress,
  ): Promise<TxHash> {
    const action = () =>
      this.core.createProof(assetId, userId, 'PUBLIC_TRANSFER', value, signer, ethSigner, undefined, to);
    const validation = async () => {
      const account = ethSigner.getAddress();
      return this.checkPublicBalanceAndAllowance(assetId, value, account);
    };
    return this.core.performAction(Action.PUBLIC_TRANSFER, value, userId, to, action, validation);
  }

  private async checkPublicBalanceAndAllowance(assetId: AssetId, value: bigint, from: EthAddress) {
    const tokenContract = this.getTokenContract(assetId);
    const tokenBalance = await tokenContract.balanceOf(from);
    if (tokenBalance < value) {
      throw new Error(`Insufficient public token balance: ${tokenContract.fromErc20Units(tokenBalance)}`);
    }
    const allowance = await tokenContract.allowance(from);
    if (allowance < value) {
      throw new Error(`Insufficient allowance: ${tokenContract.fromErc20Units(allowance)}`);
    }
  }

  public async generateAccountRecoveryData(userId: Buffer, trustedThirdPartyPublicKeys: GrumpkinAddress[]) {
    const user = this.getUserData(userId);
    if (!user) {
      throw new Error(`User not found: ${userId.toString('hex')}`);
    }

    const socialRecoverySigner = this.core.createSchnorrSigner(randomBytes(32));
    const recoveryPublicKey = socialRecoverySigner.getPublicKey();
    return Promise.all(
      trustedThirdPartyPublicKeys.map(async trustedThirdPartyPublicKey => {
        const { signature, alias, nullifiedKey } = await this.core.createAccountTx(
          user.id,
          socialRecoverySigner,
          user.publicKey,
          trustedThirdPartyPublicKey,
        );
        const recoveryData = Buffer.concat([alias, nullifiedKey.toBuffer(), signature.toBuffer()]);
        return new RecoveryPayload(trustedThirdPartyPublicKey, recoveryPublicKey, recoveryData);
      }),
    );
  }

  public async createAccount(
    userId: Buffer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress,
    alias: string,
  ) {
    const user = this.getUserData(userId);
    if (!user) {
      throw new Error(`User not found: ${userId.toString('hex')}`);
    }

    const signer = this.core.createSchnorrSigner(user.privateKey);
    return this.core.createAccountProof(user.id, signer, newSigningPublicKey, recoveryPublicKey, user.publicKey, alias);
  }

  public async recoverAccount(userId: Buffer, recoveryPayload: RecoveryPayload): Promise<TxHash> {
    const { recoveryData } = recoveryPayload;
    const alias = recoveryData.slice(0, 32).toString('hex');
    const nullifiedKey = new GrumpkinAddress(recoveryData.slice(32, 32 + 64));
    const signature = new Signature(recoveryData.slice(32 + 64, 32 + 64 + 64));
    const recoverySigner = new RecoverSignatureSigner(recoveryPayload.recoveryPublicKey, signature);
    return this.core.createAccountProof(
      userId,
      recoverySigner,
      recoveryPayload.trustedThirdPartyPublicKey,
      undefined,
      nullifiedKey,
      alias,
      true,
    );
  }

  public async addAlias(userId: Buffer, alias: string, signer: Signer): Promise<TxHash> {
    return this.core.createAccountProof(userId, signer, undefined, undefined, undefined, alias);
  }

  public async addSigningKey(userId: Buffer, signingPublicKey: GrumpkinAddress, signer: Signer): Promise<TxHash> {
    return this.core.createAccountProof(userId, signer, signingPublicKey);
  }

  public async removeSigningKey(userId: Buffer, signingPublicKey: GrumpkinAddress, signer: Signer): Promise<TxHash> {
    return this.core.createAccountProof(userId, signer, undefined, undefined, signingPublicKey);
  }

  public getUserData(userId: Buffer) {
    return this.core.getUserData(userId);
  }

  public getUsersData() {
    return this.core.getUsersData();
  }

  public createSchnorrSigner(privateKey: Buffer) {
    return this.core.createSchnorrSigner(privateKey);
  }

  public async addUser(privateKey: Buffer) {
    return this.core.addUser(privateKey);
  }

  public async removeUser(userId: Buffer) {
    return this.core.removeUser(userId);
  }

  public getUser(userId: Buffer) {
    return new WalletSdkUser(userId, this);
  }

  public getBalance(userId: Buffer) {
    return this.core.getBalance(userId);
  }

  public async getPublicBalance(assetId: AssetId, ethAddress: EthAddress) {
    return this.getTokenContract(assetId).balanceOf(ethAddress);
  }

  public async getPublicAllowance(assetId: AssetId, ethAddress: EthAddress) {
    return this.getTokenContract(assetId).allowance(ethAddress);
  }

  public fromErc20Units(assetId: AssetId, value: bigint, precision?: number) {
    return this.getTokenContract(assetId).fromErc20Units(value, precision);
  }

  public toErc20Units(assetId: AssetId, value: string) {
    return this.getTokenContract(assetId).toErc20Units(value);
  }

  public async getLatestRollups(count: number) {
    return this.core.getLatestRollups(count);
  }

  public async getLatestTxs(count: number) {
    return this.core.getLatestTxs(count);
  }

  public async getRollup(rollupId: number) {
    return this.core.getRollup(rollupId);
  }

  public async getTx(txHash: Buffer) {
    return this.core.getTx(txHash);
  }

  public async getUserTxs(userId: Buffer) {
    return this.core.getUserTxs(userId);
  }

  public startTrackingGlobalState() {
    return this.core.startTrackingGlobalState();
  }

  public stopTrackingGlobalState() {
    return this.core.stopTrackingGlobalState();
  }
}
