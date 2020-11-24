import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';
import { AssetId } from '../sdk';
import { EthereumSdk } from './';
import { EthereumSdkUserAsset } from './ethereum_sdk_user_asset';

export class EthereumSdkUser {
  constructor(public ethAddress: EthAddress, private sdk: EthereumSdk, public nonce: number) {}

  createAccount(
    alias: string,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ): Promise<TxHash> {
    return this.sdk.createAccount(alias, this.ethAddress, newSigningPublicKey, recoveryPublicKey);
  }

  async awaitSynchronised() {
    return this.sdk.awaitUserSynchronised(this.ethAddress, this.nonce);
  }

  getUserData() {
    return this.sdk.getUserData(this.ethAddress, this.nonce)!;
  }

  getTxs() {
    return this.sdk.getUserTxs(this.ethAddress, this.nonce);
  }

  getAsset(assetId: AssetId) {
    return new EthereumSdkUserAsset(this.ethAddress, assetId, this.sdk, this.nonce);
  }
}
