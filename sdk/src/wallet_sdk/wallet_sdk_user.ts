import { GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from '../sdk';
import { Signer } from '../signer';
import { WalletSdk } from '.';
import { WalletSdkUserAsset } from './wallet_sdk_user_asset';

export class WalletSdkUser {
  constructor(public id: Buffer, private sdk: WalletSdk) {}

  createAccount(alias: string, signer: Signer, newSigningPublicKey?: GrumpkinAddress) {
    return this.sdk.createAccount(this.id, signer, alias, newSigningPublicKey);
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

  getAsset(assetId: AssetId) {
    return new WalletSdkUserAsset(this.id, assetId, this.sdk);
  }
}
