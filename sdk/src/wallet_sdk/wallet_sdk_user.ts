import { GrumpkinAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';
import { AssetId } from '../sdk';
import { UserId } from '../user';
import { WalletSdk } from '.';
import { WalletSdkUserAsset } from './wallet_sdk_user_asset';

export class WalletSdkUser {
  constructor(public id: UserId, private sdk: WalletSdk) {}

  async createAccount(
    alias: string,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ): Promise<TxHash> {
    return this.sdk.createAccount(alias, this.id.publicKey, newSigningPublicKey, recoveryPublicKey);
  }

  async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.id);
  }

  getUserData() {
    return this.sdk.getUserData(this.id.publicKey, this.id.nonce)!;
  }

  getTxs() {
    return this.sdk.getUserTxs(this.id);
  }

  getAsset(assetId: AssetId) {
    return new WalletSdkUserAsset(this.id, assetId, this.sdk);
  }
}
