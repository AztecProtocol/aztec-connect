import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from '../sdk';
import { EthereumSdk } from './';
import { EthereumSdkUserAsset } from './ethereum_sdk_user_asset';

export class EthereumSdkUser {
  constructor(private ethAddress: EthAddress, private sdk: EthereumSdk) {}

  createAccount(alias: string, newSigningPublicKey?: GrumpkinAddress) {
    return this.sdk.createAccount(this.ethAddress, alias, newSigningPublicKey);
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

  getAsset(assetId: AssetId) {
    return new EthereumSdkUserAsset(this.ethAddress, assetId, this.sdk);
  }
}
