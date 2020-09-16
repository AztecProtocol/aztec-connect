import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { CoreSdk } from '../core_sdk/core_sdk';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { EthereumProvider } from '../ethereum_provider';
import { AssetId, SdkEvent } from '../sdk';
import { deriveGrumpkinPrivateKey, KeyPair, UserData } from '../user';
import { Database, DbAccount } from './database';
import { EthereumSdkUser } from './ethereum_sdk_user';

const debug = createDebug('bb:ethereum_sdk');

export interface EthUserData extends UserData {
  ethAddress: EthAddress;
}

const toEthUserData = (ethAddress: EthAddress, userData: UserData): EthUserData => ({
  ...userData,
  ethAddress,
});

export class EthereumSdk extends EventEmitter {
  private db = new Database('aztec2-sdk-eth');
  private core!: CoreSdk;
  private web3Provider: Web3Provider;
  private localAccounts: DbAccount[] = [];
  private pausedEvent: Map<SdkEvent, any[][]> = new Map();

  constructor(private ethereumProvider: EthereumProvider) {
    super();
    this.web3Provider = new Web3Provider(ethereumProvider);
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
    if (this.pausedEvent.has(event)) {
      const queued = this.pausedEvent.get(event);
      this.pausedEvent.set(event, [...queued!, args]);
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

  private pauseEvent(event: SdkEvent) {
    this.pausedEvent.set(event, []);
  }

  private resumeEvent(event: SdkEvent) {
    const queued = this.pausedEvent.get(event);
    this.pausedEvent.delete(event);
    queued?.forEach(args => this.forwardEvent(event, args));
  }

  public async init(serverUrl: string, sdkOptions: SdkOptions) {
    this.core = await createSdk(serverUrl, this.ethereumProvider, sdkOptions);

    // Forward all core sdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.core.on(event, (...args: any[]) => this.forwardEvent(event, args));
    }

    await this.updateLocalAccounts();

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
    return this.core.getTokenContract(assetId);
  }

  public async startReceivingBlocks() {
    return this.core.startReceivingBlocks();
  }

  /**
   * Called when another instance of the sdk has updated the world state db.
   */
  public async notifyWorldStateUpdated() {
    return this.core.notifyWorldStateUpdated();
  }

  /**
   * Called when another instance of the sdk has updated a users state.
   * Call the user state init function to refresh users internal state.
   * Emit an SdkEvent to update the UI.
   */
  public async notifyUserStateUpdated(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.core.notifyUserStateUpdated(userId);
  }

  public async getAddressFromAlias(alias: string) {
    return this.core.getAddressFromAlias(alias);
  }

  public async approve(assetId: AssetId, value: bigint, from: EthAddress) {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }
    return this.core.approve(assetId, userId, value, from);
  }

  public async mint(assetId: AssetId, value: bigint, from: EthAddress) {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }
    return this.core.mint(assetId, userId, value, from);
  }

  public async deposit(assetId: AssetId, value: bigint, from: EthAddress, to: GrumpkinAddress) {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }

    const signer = this.web3Provider.getSigner(from.toString());
    return this.core.deposit(assetId, userId, value, signer, to);
  }

  public async withdraw(assetId: AssetId, value: bigint, from: EthAddress, to: EthAddress) {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }
    return this.core.withdraw(assetId, userId, value, to);
  }

  public async transfer(assetId: AssetId, value: bigint, from: EthAddress, to: GrumpkinAddress) {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }
    return this.core.transfer(assetId, userId, value, to);
  }

  public async publicTransfer(assetId: AssetId, value: bigint, from: EthAddress, to: EthAddress) {
    const userId = this.getUserIdByEthAddress(from);
    if (!userId) {
      throw new Error(`User not found: ${from}`);
    }

    const signer = this.web3Provider.getSigner(from.toString());
    return this.core.publicTransfer(assetId, userId, value, signer, to);
  }

  public isBusy() {
    return this.core.isBusy();
  }

  public newKeyPair(): KeyPair {
    return this.core.newKeyPair();
  }

  public async createAccount(ethAddress: EthAddress, alias: string, newSigningPublicKey?: GrumpkinAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.core.createAccount(userId, alias, newSigningPublicKey);
  }

  public async awaitSynchronised() {
    return this.core.awaitSynchronised();
  }

  public async awaitSettlement(ethAddress: EthAddress, txHash: TxHash, timeout = 120) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.core.awaitSettlement(userId, txHash, timeout);
  }

  public getUserState(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.core.getUserState(userId);
  }

  public getUserData(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    const userData = this.core.getUserData(userId);
    return userData ? toEthUserData(ethAddress, userData) : undefined;
  }

  public getUsersData() {
    return this.core.getUsersData().map(userData => {
      const ethAddress = this.getEthAddressByUserId(userData.id)!;
      return toEthUserData(ethAddress, userData);
    });
  }

  public async addUser(ethAddress: EthAddress) {
    const privateKey = await deriveGrumpkinPrivateKey(ethAddress, this.web3Provider);
    this.pauseEvent(SdkEvent.UPDATED_USERS);
    try {
      const coreUser = await this.core.addUser(privateKey);
      await this.db.addAccount({ ethAddress, userId: coreUser.id });
      await this.updateLocalAccounts();
      this.resumeEvent(SdkEvent.UPDATED_USERS);
      return new EthereumSdkUser(ethAddress, this);
    } catch (err) {
      this.resumeEvent(SdkEvent.UPDATED_USERS);
      throw err;
    }
  }

  public async removeUser(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }

    await this.db.deleteAccount(ethAddress);
    await this.updateLocalAccounts();
    return this.core.removeUser(userId);
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
    return this.core.getBalance(userId);
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

  public async getUserTxs(ethAddress: EthAddress) {
    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.core.getUserTxs(userId);
  }

  public getActionState(ethAddress?: EthAddress) {
    if (!ethAddress) {
      return this.core.getActionState();
    }

    const userId = this.getUserIdByEthAddress(ethAddress);
    if (!userId) {
      throw new Error(`User not found: ${ethAddress}`);
    }
    return this.core.getActionState(userId);
  }

  public startTrackingGlobalState() {
    return this.core.startTrackingGlobalState();
  }

  public stopTrackingGlobalState() {
    return this.core.stopTrackingGlobalState();
  }
}
