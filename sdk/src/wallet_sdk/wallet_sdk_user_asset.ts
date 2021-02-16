import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { Signer } from '../signer';
import { AccountId } from '../user';
import { JoinSplitTxOptions } from './tx_options';
import { WalletSdk } from '.';

export class WalletSdkUserAsset {
  constructor(public userId: AccountId, public assetId: AssetId, private sdk: WalletSdk) {}

  info() {
    return this.sdk.getAssetInfo(this.assetId);
  }

  balance() {
    return this.sdk.getBalance(this.assetId, this.userId);
  }

  async getMaxSpendableValue() {
    return this.sdk.getMaxSpendableValue(this.assetId, this.userId);
  }

  async mint(value: bigint, account: EthAddress) {
    return this.sdk.mint(this.assetId, this.userId, value, account);
  }

  async approve(value: bigint, account: EthAddress) {
    return this.sdk.approve(this.assetId, this.userId, value, account);
  }

  async deposit(value: bigint, fee: bigint, signer: Signer, from: EthAddress) {
    return this.sdk.deposit(this.assetId, from, this.userId, value, fee, signer);
  }

  async withdraw(value: bigint, fee: bigint, signer: Signer, to: EthAddress) {
    return this.sdk.withdraw(this.assetId, this.userId, value, fee, signer, to);
  }

  async transfer(value: bigint, fee: bigint, signer: Signer, to: AccountId) {
    return this.sdk.transfer(this.assetId, this.userId, value, fee, signer, to);
  }

  async joinSplit(
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    signer: Signer,
    options?: JoinSplitTxOptions,
  ) {
    return this.sdk.joinSplit(
      this.assetId,
      this.userId,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      signer,
      options,
    );
  }

  public fromBaseUnits(value: bigint, precision?: number) {
    return this.sdk.fromBaseUnits(this.assetId, value, precision);
  }

  public toBaseUnits(value: string) {
    return this.sdk.toBaseUnits(this.assetId, value);
  }

  public async getFee() {
    return this.sdk.getFee(this.assetId);
  }
}
