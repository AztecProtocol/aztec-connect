import { Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { CoreSdk } from '../core_sdk/core_sdk';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { EthereumProvider } from '../ethereum_provider';
import { Action, AssetId, SdkEvent } from '../sdk';
import { Signer } from '../signer';
import { TokenContract, Web3TokenContract } from '../token_contract';
import { MockTokenContract } from '../token_contract/mock_token_contract';
import { KeyPair } from '../user';
import { WalletSdkUser } from './wallet_sdk_user';

export * from './wallet_sdk_user';
export * from './wallet_sdk_user_asset';

const debug = createDebug('bb:wallet_sdk');

export class WalletSdk extends EventEmitter {
  private core!: CoreSdk;
  private tokenContracts: TokenContract[] = [];

  constructor(private provider: Provider) {
    super();
  }

  public async init(serverUrl: string, sdkOptions?: SdkOptions, ethereumProvider?: EthereumProvider) {
    this.core = await createSdk(serverUrl, sdkOptions, ethereumProvider);

    // Forward all core sdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.core.on(event, (...args: any[]) => this.emit(event, ...args));
    }

    const { chainId, networkOrHost, rollupContractAddress, tokenContractAddress } = await this.core.getRemoteStatus();

    const { chainId: ethProviderChainId } = await this.provider.getNetwork();
    if (chainId !== ethProviderChainId) {
      throw new Error(`Provider chainId ${ethProviderChainId} does not match rollup provider chainId ${chainId}.`);
    }

    this.tokenContracts[AssetId.DAI] =
      networkOrHost !== 'development'
        ? new Web3TokenContract(this.provider, tokenContractAddress, rollupContractAddress, chainId)
        : new MockTokenContract();
    await Promise.all(this.tokenContracts.map(tc => tc.init()));

    await this.core.init();
  }

  public async initUserStates() {
    return this.core.initUserStates();
  }

  public async destroy() {
    return this.core?.destroy();
  }

  public async clearData() {
    return this.core.clearData();
  }

  public async notifiedClearData() {
    return this.core.notifiedClearData();
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

  public async startReceivingBlocks() {
    return this.core.startReceivingBlocks();
  }

  public async getAddressFromAlias(alias: string) {
    return this.core.getAddressFromAlias(alias);
  }

  public async approve(assetId: AssetId, userId: Buffer, value: bigint, signer: Signer) {
    const action = () => this.getTokenContract(assetId).approve(value, signer);
    const { rollupContractAddress } = this.core.getLocalStatus();
    const txHash = await this.core.performAction(Action.APPROVE, value, userId, rollupContractAddress, action);
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  public async mint(assetId: AssetId, userId: Buffer, value: bigint, signer: Signer) {
    const action = () => this.getTokenContract(assetId).mint(value, signer);
    const to = await signer.getAddress();
    const txHash = await this.core.performAction(Action.MINT, value, userId, EthAddress.fromString(to), action);
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  public async deposit(assetId: AssetId, userId: Buffer, value: bigint, signer: Signer, to?: GrumpkinAddress | string) {
    const recipient = !to
      ? this.getUserData(userId)!.publicKey
      : typeof to === 'string'
      ? await this.getAddressFromAlias(to)
      : to;
    const action = () => this.core.createProof(assetId, userId, 'DEPOSIT', value, recipient, undefined, signer);
    const validation = async () => {
      if (!recipient) {
        throw new Error(`No address found for alias: ${to}`);
      }
      const account = await signer.getAddress();
      return this.checkPublicBalanceAndAllowance(assetId, value, EthAddress.fromString(account));
    };
    return this.core.performAction(Action.DEPOSIT, value, userId, to || recipient!, action, validation);
  }

  public async withdraw(assetId: AssetId, userId: Buffer, value: bigint, to: EthAddress) {
    const action = () => this.core.createProof(assetId, userId, 'WITHDRAW', value, undefined, to);
    return this.core.performAction(Action.WITHDRAW, value, userId, to, action);
  }

  public async transfer(assetId: AssetId, userId: Buffer, value: bigint, to: GrumpkinAddress | string) {
    const recipient = typeof to === 'string' ? await this.getAddressFromAlias(to) : to;
    const action = () => this.core.createProof(assetId, userId, 'TRANSFER', value, recipient);
    return this.core.performAction(Action.TRANSFER, value, userId, to, action);
  }

  public async publicTransfer(assetId: AssetId, userId: Buffer, value: bigint, signer: Signer, to: EthAddress) {
    const action = () => this.core.createProof(assetId, userId, 'PUBLIC_TRANSFER', value, undefined, to, signer);
    const validation = async () => {
      const account = await signer.getAddress();
      return this.checkPublicBalanceAndAllowance(assetId, value, EthAddress.fromString(account));
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

  public isBusy() {
    return this.core.isBusy();
  }

  public newKeyPair(): KeyPair {
    return this.core.newKeyPair();
  }

  public async createAccount(userId: Buffer, alias: string, newSigningPublicKey?: GrumpkinAddress) {
    return this.core.createAccount(userId, alias, newSigningPublicKey);
  }

  public async awaitSynchronised() {
    return this.core.awaitSynchronised();
  }

  public async awaitSettlement(userId: Buffer, txHash: TxHash, timeout = 120) {
    return this.core.awaitSettlement(userId, txHash, timeout);
  }

  public getUserState(userId: Buffer) {
    return this.core.getUserState(userId);
  }

  public getUserData(userId: Buffer) {
    return this.core.getUserData(userId);
  }

  public getUsersData() {
    return this.core.getUsersData();
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

  public fromErc20Units(assetId: AssetId, value: bigint) {
    return this.getTokenContract(assetId).fromErc20Units(value);
  }

  public toErc20Units(assetId: AssetId, value: string) {
    return this.getTokenContract(assetId).toErc20Units(value);
  }

  public async getLatestRollups(count: number) {
    return this.core.getLatestRollups();
  }

  public async getLatestTxs(count: number) {
    return this.core.getLatestTxs();
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

  public getActionState(userId?: Buffer) {
    return this.core.getActionState(userId);
  }

  public startTrackingGlobalState() {
    return this.core.startTrackingGlobalState();
  }

  public stopTrackingGlobalState() {
    return this.core.stopTrackingGlobalState();
  }
}
