import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AztecSdk } from './aztec_sdk';

export class AztecSdkUser {
  constructor(public id: GrumpkinAddress, private sdk: AztecSdk) {}

  public async isSynching() {
    return this.sdk.isUserSynching(this.id);
  }

  public async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.id);
  }

  public async getSpendingKeys() {
    return this.sdk.getSpendingKeys(this.id);
  }

  public async getUserData() {
    return this.sdk.getUserData(this.id);
  }

  public async getBalance(assetId: number) {
    return this.sdk.getBalance(this.id, assetId);
  }

  public async getSpendableSum(assetId: number, excludePendingNotes?: boolean) {
    return this.sdk.getSpendableSum(this.id, assetId, excludePendingNotes);
  }

  public async getSpendableSums(excludePendingNotes?: boolean) {
    return this.sdk.getSpendableSums(this.id, excludePendingNotes);
  }

  public async getMaxSpendableValue(assetId: number, numNotes?: number, excludePendingNotes?: boolean) {
    return this.sdk.getMaxSpendableValue(this.id, assetId, numNotes, excludePendingNotes);
  }

  public async getTxs() {
    return this.sdk.getUserTxs(this.id);
  }

  public async getPaymentTxs() {
    return this.sdk.getPaymentTxs(this.id);
  }

  public async getAccountTxs() {
    return this.sdk.getAccountTxs(this.id);
  }

  public async getDefiTxs() {
    return this.sdk.getDefiTxs(this.id);
  }
}
