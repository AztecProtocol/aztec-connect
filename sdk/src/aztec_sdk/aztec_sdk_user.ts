import { AccountId } from '@aztec/barretenberg/account_id';
import { AztecSdk } from './aztec_sdk';

export class AztecSdkUser {
  constructor(public id: AccountId, private sdk: AztecSdk) {}

  public async isSynching() {
    return this.sdk.isUserSynching(this.id);
  }

  public async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.id);
  }

  public async getSigningKeys() {
    return this.sdk.getSigningKeys(this.id);
  }

  public async getUserData() {
    return this.sdk.getUserData(this.id);
  }

  public async getBalance(assetId: number) {
    return this.sdk.getBalance(assetId, this.id);
  }

  public async getMaxSpendableValue(assetId: number) {
    return this.sdk.getMaxSpendableValue(assetId, this.id);
  }

  public async getSpendableNotes(assetId: number) {
    return this.sdk.getSpendableNotes(assetId, this.id);
  }

  public async getSpendableSum(assetId: number) {
    return this.sdk.getSpendableSum(assetId, this.id);
  }

  public async getNotes() {
    return this.sdk.getNotes(this.id);
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
