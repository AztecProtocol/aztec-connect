import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { AccountId, RecoveryPayload } from '../user';
import { WalletSdk } from '.';
import { WalletSdkUserAsset } from './wallet_sdk_user_asset';
import { Signer } from '../signer';

export class WalletSdkUser {
  constructor(public id: AccountId, private sdk: WalletSdk) {}

  async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.id);
  }

  async createAccount(alias: string, newSigningPublicKey: GrumpkinAddress, recoveryPublicKey?: GrumpkinAddress) {
    return this.sdk.createAccount(this.id, alias, newSigningPublicKey, recoveryPublicKey);
  }

  public async recoverAccount(recoveryPayload: RecoveryPayload) {
    return this.sdk.recoverAccount(recoveryPayload);
  }

  public async migrateAccount(
    signer: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ) {
    return this.sdk.migrateAccount(this.id, signer, newSigningPublicKey, recoveryPublicKey, newAccountPrivateKey);
  }

  public async addSigningKeys(signer: Signer, signingPublicKey1: GrumpkinAddress, signingPublicKey2?: GrumpkinAddress) {
    return this.sdk.addSigningKeys(this.id, signer, signingPublicKey1, signingPublicKey2);
  }

  public async getSigningKeys() {
    return this.sdk.getSigningKeys(this.id);
  }

  public getUserData() {
    return this.sdk.getUserData(this.id);
  }

  public async getJoinSplitTxs() {
    return this.sdk.getJoinSplitTxs(this.id);
  }

  public async getAccountTxs() {
    return this.sdk.getAccountTxs(this.id);
  }

  public async getNotes() {
    return this.sdk.getNotes(this.id);
  }

  public getAsset(assetId: AssetId) {
    return new WalletSdkUserAsset(this.id, assetId, this.sdk);
  }

  public getSigner() {
    return this.sdk.createSchnorrSigner(this.getUserData().privateKey);
  }
}
