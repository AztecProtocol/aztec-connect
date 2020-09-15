import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { CoreSdk } from '../core_sdk/core_sdk';
import { createSdk } from '../core_sdk/create_sdk';
import { EthereumProvider } from '../ethereum_provider';
import { AssetId, SdkEvent, TxHash } from '../sdk';
import { KeyPair } from '../user';

const debug = createDebug('bb:ethereum_sdk');

export class EthereumSdk extends EventEmitter {
  private core!: CoreSdk;

  constructor(private ethereumProvider: EthereumProvider) {
    super();
  }

  public async init(serverUrl: string, clearDb = false) {
    this.core = await createSdk(serverUrl, this.ethereumProvider, { clearDb });

    // Forward all core sdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.core.on(event, (...args: any[]) => this.emit(event, ...args));
    }

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
    return this.core.notifyUserStateUpdated(ethAddress);
  }

  public async getAddressFromAlias(alias: string) {
    return this.core.getAddressFromAlias(alias);
  }

  public async approve(assetId: AssetId, value: bigint, from: EthAddress) {
    return this.core.approve(assetId, value, from);
  }

  public async mint(assetId: AssetId, value: bigint, to: EthAddress) {
    return this.core.mint(assetId, value, to);
  }

  public async deposit(assetId: AssetId, value: bigint, from: EthAddress, to: GrumpkinAddress) {
    return this.core.deposit(assetId, value, from, to);
  }

  public async withdraw(assetId: AssetId, value: bigint, from: EthAddress, to: EthAddress) {
    return this.core.withdraw(assetId, value, from, to);
  }

  public async transfer(assetId: AssetId, value: bigint, from: EthAddress, to: GrumpkinAddress) {
    return this.core.transfer(assetId, value, from, to);
  }

  public async publicTransfer(assetId: AssetId, value: bigint, from: EthAddress, to: EthAddress) {
    return this.core.publicTransfer(assetId, value, from, to);
  }

  public isBusy() {
    return this.core.isBusy();
  }

  public newKeyPair(): KeyPair {
    return this.core.newKeyPair();
  }

  public async createAccount(ethAddress: EthAddress, alias: string, newSigningPublicKey?: GrumpkinAddress) {
    return this.core.createAccount(ethAddress, alias, newSigningPublicKey);
  }

  public async awaitSynchronised() {
    return this.core.awaitSynchronised();
  }

  public async awaitSettlement(address: EthAddress, txHash: TxHash, timeout = 120) {
    return this.core.awaitSettlement(address, txHash, timeout);
  }

  public getUserState(ethAddress: EthAddress) {
    return this.core.getUserState(ethAddress);
  }

  public getUserData(ethAddress: EthAddress) {
    return this.core.getUserData(ethAddress);
  }

  public getUsersData() {
    return this.core.getUsersData();
  }

  public async addUser(ethAddress: EthAddress) {
    return this.core.addUser(ethAddress);
  }

  public async removeUser(ethAddress: EthAddress) {
    return this.core.removeUser(ethAddress);
  }

  public getUser(address: EthAddress) {
    return this.core.getUser(address);
  }

  public getBalance(ethAddress: EthAddress) {
    return this.core.getBalance(ethAddress);
  }

  public async getLatestRollups() {
    return this.core.getLatestRollups();
  }

  public async getLatestTxs() {
    return this.core.getLatestTxs();
  }

  public async getRollup(rollupId: number) {
    return this.core.getRollup(rollupId);
  }

  public async getTx(txHash: Buffer) {
    return this.core.getTx(txHash);
  }

  public async getUserTxs(ethAddress: EthAddress) {
    return this.core.getUserTxs(ethAddress);
  }

  public getActionState() {
    return this.core.getActionState();
  }

  public startTrackingGlobalState() {
    return this.core.startTrackingGlobalState();
  }

  public stopTrackingGlobalState() {
    return this.core.stopTrackingGlobalState();
  }
}
