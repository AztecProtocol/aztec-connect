import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { TxType } from 'barretenberg/blockchain';
import { AccountId } from '../user';
import { EthereumSdk } from './';

export class EthereumSdkUserAsset {
  constructor(
    private address: EthAddress,
    private accountId: AccountId,
    private assetId: AssetId,
    private sdk: EthereumSdk,
  ) {}

  getInfo() {
    return this.sdk.getAssetInfo(this.assetId);
  }

  publicBalance() {
    return this.sdk.getPublicBalance(this.assetId, this.address);
  }

  publicAllowance() {
    return this.sdk.getPublicAllowance(this.assetId, this.address);
  }

  getUserPendingDeposit() {
    return this.sdk.getUserPendingDeposit(this.assetId, this.address);
  }

  balance() {
    return this.sdk.getBalance(this.assetId, this.accountId);
  }

  async getMaxSpendableValue() {
    return this.sdk.getMaxSpendableValue(this.assetId, this.accountId);
  }

  async mint(value: bigint) {
    return this.sdk.mint(this.assetId, this.accountId, value, this.address);
  }

  async approve(value: bigint) {
    return this.sdk.approve(this.assetId, this.accountId, value, this.address);
  }

  async deposit(value: bigint, fee: bigint) {
    return this.sdk.deposit(this.assetId, this.address, this.accountId, value, fee);
  }

  async withdraw(value: bigint, fee: bigint) {
    return this.sdk.withdraw(this.assetId, this.accountId, this.address, value, fee);
  }

  async transfer(value: bigint, fee: bigint, to: AccountId) {
    return this.sdk.transfer(this.assetId, this.accountId, to, value, fee);
  }

  public fromBaseUnits(value: bigint, precision?: number) {
    return this.sdk.fromBaseUnits(this.assetId, value, precision);
  }

  public toBaseUnits(value: string) {
    return this.sdk.toBaseUnits(this.assetId, value);
  }

  public async getFee(txType: TxType) {
    return this.sdk.getFee(this.assetId, txType);
  }
}
