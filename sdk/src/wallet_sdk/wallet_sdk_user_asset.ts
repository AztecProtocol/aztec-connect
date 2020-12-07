import { EthAddress } from 'barretenberg/address';
import { AssetId } from '../sdk';
import { EthereumSigner, Signer } from '../signer';
import { AccountId } from '../user';
import { WalletSdk } from '.';
import { PermitArgs } from 'blockchain';

export class WalletSdkUserAsset {
  constructor(public userId: AccountId, public id: AssetId, private sdk: WalletSdk) {}

  async publicBalance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).balanceOf(ethAddress);
  }

  async publicAllowance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).allowance(ethAddress);
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

  async deposit(value: bigint, signer: Signer, ethSigner: EthereumSigner, permitArgs: PermitArgs, to?: AccountId) {
    return this.sdk.deposit(this.id, this.userId, value, signer, ethSigner, permitArgs, to);
  }

  async withdraw(value: bigint, signer: Signer, to: EthAddress) {
    return this.sdk.withdraw(this.id, this.userId, value, signer, to);
  }

  async transfer(value: bigint, signer: Signer, to: AccountId) {
    return this.sdk.transfer(this.id, this.userId, value, signer, to);
  }

  public fromErc20Units(value: bigint, precision?: number) {
    return this.sdk.fromErc20Units(this.id, value, precision);
  }

  public toErc20Units(value: string) {
    return this.sdk.toErc20Units(this.id, value);
  }
}
