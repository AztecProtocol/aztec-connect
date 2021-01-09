import { EthAddress } from 'barretenberg/address';
import { JoinSplitTxOptions } from '../wallet_sdk';
import { AssetId } from '../sdk';
import { EthereumSigner, Signer } from '../signer';
import { AccountId } from '../user';
import { WalletSdk } from '.';
import { PermitArgs } from 'blockchain';

export class WalletSdkUserAsset {
  constructor(public userId: AccountId, public id: AssetId, private sdk: WalletSdk) {}

  async publicBalance(ethAddress: EthAddress) {
    return this.sdk.getPublicBalance(this.id, ethAddress);
  }

  async publicAllowance(ethAddress: EthAddress) {
    return this.sdk.getPublicAllowance(this.id, ethAddress);
  }

  balance() {
    return this.sdk.getBalance(this.id, this.userId);
  }

  async mint(value: bigint, account: EthAddress) {
    return this.sdk.mint(this.id, this.userId, value, account);
  }

  async approve(value: bigint, account: EthAddress) {
    return this.sdk.approve(this.id, this.userId, value, account);
  }

  async deposit(
    value: bigint,
    signer: Signer,
    ethSigner: EthereumSigner,
    permitArgs: PermitArgs,
    to?: AccountId,
    options?: JoinSplitTxOptions,
  ) {
    return this.sdk.deposit(this.id, this.userId, value, signer, ethSigner, permitArgs, to, options);
  }

  async withdraw(value: bigint, signer: Signer, to: EthAddress, options?: JoinSplitTxOptions) {
    return this.sdk.withdraw(this.id, this.userId, value, signer, to, options);
  }

  async transfer(value: bigint, signer: Signer, to: AccountId, options?: JoinSplitTxOptions) {
    return this.sdk.transfer(this.id, this.userId, value, signer, to, options);
  }

  public fromErc20Units(value: bigint, precision?: number) {
    return this.sdk.fromErc20Units(this.id, value, precision);
  }

  public toErc20Units(value: string) {
    return this.sdk.toErc20Units(this.id, value);
  }
}
