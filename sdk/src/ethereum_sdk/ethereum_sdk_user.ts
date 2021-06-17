import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { AccountId } from '../user';
import { EthereumSdk } from './';
import { EthereumSdkUserAsset } from './ethereum_sdk_user_asset';

export class EthereumSdkUser {
  constructor(private address: EthAddress, private accountId: AccountId, private sdk: EthereumSdk) {}

  isSynching() {
    return this.sdk.isUserSynching(this.accountId);
  }

  async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.accountId);
  }

  createAccount(alias: string, newSigningPublicKey: GrumpkinAddress, recoveryPublicKey?: GrumpkinAddress) {
    return this.sdk.createAccount(this.accountId, alias, newSigningPublicKey, recoveryPublicKey);
  }

  getUserData() {
    return this.sdk.getUserData(this.accountId);
  }

  remove() {
    return this.sdk.removeUser(this.address, this.accountId);
  }

  async getJoinSplitTxs() {
    return this.sdk.getJoinSplitTxs(this.accountId);
  }

  async getAccountTxs() {
    return this.sdk.getAccountTxs(this.accountId);
  }

  async getNotes() {
    return this.sdk.getNotes(this.accountId);
  }

  getAsset(assetId: AssetId) {
    return new EthereumSdkUserAsset(this.address, this.accountId, assetId, this.sdk);
  }
}
