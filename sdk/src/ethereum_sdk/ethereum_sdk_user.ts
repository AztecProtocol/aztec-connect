import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { AccountId } from '../user';
import { EthereumSdk } from './';
import { EthereumSdkUserAsset } from './ethereum_sdk_user_asset';

export class EthereumSdkUser {
  constructor(private address: EthAddress, private accountId: AccountId, private sdk: EthereumSdk) {}

  async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.accountId);
  }

  createAccount(alias: string, newSigningPublicKey: GrumpkinAddress, recoveryPublicKey?: GrumpkinAddress) {
    return this.sdk.createAccount(this.accountId, this.address, alias, newSigningPublicKey, recoveryPublicKey);
  }

  getUserData() {
    return this.sdk.getUserData(this.accountId);
  }

  public async getJoinSplitTxs() {
    return this.sdk.getJoinSplitTxs(this.accountId);
  }

  public async getAccountTxs() {
    return this.sdk.getAccountTxs(this.accountId);
  }

  public async getNotes() {
    return this.sdk.getNotes(this.accountId);
  }

  getAsset(assetId: AssetId) {
    return new EthereumSdkUserAsset(this.address, this.accountId, assetId, this.sdk);
  }
}
