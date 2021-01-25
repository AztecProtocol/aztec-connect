import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { Signer } from '../signer';
import { RecoveryPayload } from '../user';
import { EthereumSdk } from './';
import { EthereumSdkUserAsset } from './ethereum_sdk_user_asset';
import { EthUserId } from './eth_user_id';

export class EthereumSdkUser {
  constructor(public ethUserId: EthUserId, private sdk: EthereumSdk) {}

  async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.ethUserId);
  }

  createAccount(alias: string, newSigningPublicKey: GrumpkinAddress, recoveryPublicKey?: GrumpkinAddress) {
    return this.sdk.createAccount(this.ethUserId, alias, newSigningPublicKey, recoveryPublicKey);
  }

  async recoverAccount(recoveryPayload: RecoveryPayload) {
    return this.sdk.recoverAccount(recoveryPayload);
  }

  public async migrateAccount(
    signer: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
    newEthAddress?: EthAddress,
  ) {
    return this.sdk.migrateAccount(this.ethUserId, signer, newSigningPublicKey, recoveryPublicKey, newEthAddress);
  }

  async addSigningKeys(signer: Signer, signingPublicKey1: GrumpkinAddress, signingPublicKey2?: GrumpkinAddress) {
    return this.sdk.addSigningKeys(this.ethUserId, signer, signingPublicKey1, signingPublicKey2);
  }

  public async getSigningKeys() {
    return this.sdk.getSigningKeys(this.ethUserId);
  }

  getUserData() {
    return this.sdk.getUserData(this.ethUserId);
  }

  public async getJoinSplitTxs() {
    return this.sdk.getJoinSplitTxs(this.ethUserId);
  }

  public async getAccountTxs() {
    return this.sdk.getAccountTxs(this.ethUserId);
  }

  public async getNotes() {
    return this.sdk.getNotes(this.ethUserId);
  }

  getAsset(assetId: AssetId) {
    return new EthereumSdkUserAsset(this.ethUserId, assetId, this.sdk);
  }
}
