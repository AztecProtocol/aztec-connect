import { EthAddress } from 'barretenberg/address';
import { AssetId } from '../sdk';
import { Signer } from '../signer';
import { AccountId } from '../user';
import { JoinSplitTxOptions } from '../wallet_sdk';
import { EthereumSdk } from './';
import { EthUserId } from './eth_user_id';

export class EthereumSdkUserAsset {
  constructor(public ethUserId: EthUserId, public id: AssetId, private sdk: EthereumSdk) {}

  symbol() {
    return this.sdk.getTokenContract(this.id).name();
  }

  publicBalance() {
    return this.sdk.getPublicBalance(this.id, this.ethUserId.ethAddress);
  }

  publicAllowance() {
    return this.sdk.getPublicAllowance(this.id, this.ethUserId.ethAddress);
  }

  getUserPendingDeposit() {
    return this.sdk.getUserPendingDeposit(this.id, this.ethUserId.ethAddress);
  }

  getPermitSupport() {
    return this.sdk.getAssetPermitSupport(this.id);
  }

  balance() {
    return this.sdk.getBalance(this.id, this.ethUserId);
  }

  async mint(value: bigint) {
    return this.sdk.mint(this.id, value, this.ethUserId);
  }

  async approve(value: bigint) {
    return this.sdk.approve(this.id, value, this.ethUserId);
  }

  async deposit(value: bigint, to?: AccountId, signer?: Signer, options?: JoinSplitTxOptions) {
    return this.sdk.deposit(this.id, value, this.ethUserId, to, signer, options);
  }

  async withdraw(value: bigint, to?: EthAddress, signer?: Signer, options?: JoinSplitTxOptions) {
    return this.sdk.withdraw(this.id, value, this.ethUserId, to || this.ethUserId.ethAddress, signer, options);
  }

  async transfer(value: bigint, to: AccountId, signer?: Signer, options?: JoinSplitTxOptions) {
    return this.sdk.transfer(this.id, value, this.ethUserId, to, signer, options);
  }

  public fromErc20Units(value: bigint, precision?: number) {
    return this.sdk.getTokenContract(this.id).fromErc20Units(value, precision);
  }

  public toErc20Units(value: string) {
    return this.sdk.getTokenContract(this.id).toErc20Units(value);
  }
}
