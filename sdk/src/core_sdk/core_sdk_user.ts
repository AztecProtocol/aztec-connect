import { SdkUser, SdkUserAsset, AssetId } from '../sdk';
import { EthAddress } from 'barretenberg/address';
import { CoreSdk } from './core_sdk';
import { CoreSdkUserAsset } from './core_sdk_user_asset';

export class CoreSdkUser implements SdkUser {
  constructor(private ethAddress: EthAddress, private sdk: CoreSdk) {}

  createAccount(alias: string, newSigningPublicKey: Buffer): Promise<void> {
    throw new Error('Method not implemented.');
  }

  addSigningKey(signingPublicKey: Buffer): Promise<void> {
    throw new Error('Method not implemented.');
  }

  removeSigningKey(signingPublicKey: Buffer): Promise<void> {
    throw new Error('Method not implemented.');
  }

  getUserData() {
    return this.sdk.getUserData(this.ethAddress)!;
  }

  getTxs() {
    return this.sdk.getUserTxs(this.ethAddress);
  }

  getAsset(assetId: AssetId): SdkUserAsset {
    return new CoreSdkUserAsset(this.ethAddress, assetId, this.sdk);
  }
}
