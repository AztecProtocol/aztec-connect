import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AztecSdk } from './aztec_sdk';

export class AztecSdkUser {
  constructor(public id: GrumpkinAddress, private sdk: AztecSdk) {}

  public async isSynching() {
    return await this.sdk.isUserSynching(this.id);
  }

  public async awaitSynchronised(timeout?: number) {
    return await this.sdk.awaitUserSynchronised(this.id, timeout);
  }

  public async getSyncedToRollup() {
    return await this.sdk.getUserSyncedToRollup(this.id);
  }

  public async getSpendingKeys() {
    return await this.sdk.getSpendingKeys(this.id);
  }

  public async getBalance(assetId: number) {
    return await this.sdk.getBalance(this.id, assetId);
  }

  public async getSpendableSum(assetId: number, excludePendingNotes?: boolean) {
    return await this.sdk.getSpendableSum(this.id, assetId, excludePendingNotes);
  }

  public async getSpendableSums(excludePendingNotes?: boolean) {
    return await this.sdk.getSpendableSums(this.id, excludePendingNotes);
  }

  public async getMaxSpendableValue(assetId: number, numNotes?: number, excludePendingNotes?: boolean) {
    return await this.sdk.getMaxSpendableValue(this.id, assetId, numNotes, excludePendingNotes);
  }

  public async getTxs() {
    return await this.sdk.getUserTxs(this.id);
  }

  public async getPaymentTxs() {
    return await this.sdk.getPaymentTxs(this.id);
  }

  public async getAccountTxs() {
    return await this.sdk.getAccountTxs(this.id);
  }

  public async getDefiTxs() {
    return await this.sdk.getDefiTxs(this.id);
  }
}
