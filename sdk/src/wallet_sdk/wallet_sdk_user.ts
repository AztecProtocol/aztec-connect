import { GrumpkinAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';
import { AssetId } from '../sdk';
import { Signer } from '../signer';
import { RecoveryPayload } from '../user';
import { WalletSdk } from '.';
import { WalletSdkUserAsset } from './wallet_sdk_user_asset';

export class WalletSdkUser {
  constructor(public id: Buffer, private sdk: WalletSdk) {}

  public async generateAccountRecoveryData(trustedThirdPartyPublicKeys: GrumpkinAddress[]) {
    return this.sdk.generateAccountRecoveryData(this.id, trustedThirdPartyPublicKeys);
  }

  async createAccount(
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress,
    alias: string,
  ): Promise<TxHash> {
    return this.sdk.createAccount(this.id, newSigningPublicKey, recoveryPublicKey, alias);
  }

  async recoverAccount(recoveryPayload: RecoveryPayload): Promise<TxHash> {
    return this.sdk.recoverAccount(this.id, recoveryPayload);
  }

  async addAlias(alias: string, signer: Signer): Promise<TxHash> {
    return this.sdk.addAlias(this.id, alias, signer);
  }

  async addSigningKey(signingPublicKey: GrumpkinAddress, signer: Signer): Promise<TxHash> {
    return this.sdk.addSigningKey(this.id, signingPublicKey, signer);
  }

  async removeSigningKey(signingPublicKey: GrumpkinAddress, signer: Signer): Promise<TxHash> {
    return this.sdk.removeSigningKey(this.id, signingPublicKey, signer);
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
