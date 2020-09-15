import { SdkUser, SdkUserAsset, AssetId } from '../sdk';
import { GrumpkinAddress } from 'barretenberg/address';
import { CoreSdk } from './core_sdk';
import { CoreSdkUserAsset } from './core_sdk_user_asset';

export class CoreSdkUser implements SdkUser {
  constructor(private id: Buffer, private sdk: CoreSdk) {}

  createAccount(alias: string, newSigningPublicKey?: GrumpkinAddress) {
    return this.sdk.createAccount(this.id, alias, newSigningPublicKey);
  }

  addSigningKey(signingPublicKey: Buffer): Promise<void> {
    throw new Error('Method not implemented.');
  }

  removeSigningKey(signingPublicKey: Buffer): Promise<void> {
    throw new Error('Method not implemented.');
  }

  getUserData() {
    return this.sdk.getUserData(this.id)!;
  }

  getTxs() {
    return this.sdk.getUserTxs(this.id);
  }

  getAsset(assetId: AssetId): SdkUserAsset {
    return new CoreSdkUserAsset(this.id, assetId, this.sdk);
  }
}
