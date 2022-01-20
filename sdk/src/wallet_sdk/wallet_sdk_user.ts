import { AccountId } from '@aztec/barretenberg/account_id';
import { AssetId } from '@aztec/barretenberg/asset';
import { WalletSdk } from '.';

export class WalletSdkUser {
  constructor(public id: AccountId, private sdk: WalletSdk) {}

  isSynching() {
    return this.sdk.isUserSynching(this.id);
  }

  async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.id);
  }

  public async getSigningKeys() {
    return this.sdk.getSigningKeys(this.id);
  }

  public getUserData() {
    return this.sdk.getUserData(this.id);
  }

  public getBalance(assetId: AssetId) {
    return this.sdk.getBalance(assetId, this.id);
  }

  public async getMaxSpendableValue(assetId: AssetId) {
    return this.sdk.getMaxSpendableValue(assetId, this.id);
  }

  public async getSpendableNotes(assetId: AssetId) {
    return this.sdk.getSpendableNotes(assetId, this.id);
  }

  public async getSpendableSum(assetId: AssetId) {
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
