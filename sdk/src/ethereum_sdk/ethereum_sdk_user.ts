import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';
import { AssetId } from '../sdk';
import { Signer } from '../signer';
import { RecoveryPayload } from '../user';
import { EthereumSdk } from './';
import { EthereumSdkUserAsset } from './ethereum_sdk_user_asset';

export class EthereumSdkUser {
  constructor(private ethAddress: EthAddress, private sdk: EthereumSdk) {}

  public async generateAccountRecoveryData(trustedThirdPartyPublicKeys: GrumpkinAddress[]) {
    return this.sdk.generateAccountRecoveryData(this.ethAddress, trustedThirdPartyPublicKeys);
  }

  createAccount(
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress,
    alias: string,
  ): Promise<TxHash> {
    return this.sdk.createAccount(this.ethAddress, newSigningPublicKey, recoveryPublicKey, alias);
  }

  async recoverAccount(recoveryPayload: RecoveryPayload): Promise<TxHash> {
    return this.sdk.recoverAccount(this.ethAddress, recoveryPayload);
  }

  async addAlias(alias: string, signer: Signer): Promise<TxHash> {
    return this.sdk.addAlias(this.ethAddress, alias, signer);
  }

  async addSigningKey(signingPublicKey: GrumpkinAddress, signer: Signer): Promise<TxHash> {
    return this.sdk.addSigningKey(this.ethAddress, signingPublicKey, signer);
  }

  async removeSigningKey(signingPublicKey: GrumpkinAddress, signer: Signer): Promise<TxHash> {
    return this.sdk.removeSigningKey(this.ethAddress, signingPublicKey, signer);
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
