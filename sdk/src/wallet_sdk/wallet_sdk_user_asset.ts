import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from '../sdk';
import { Signer } from '../signer';
import { WalletSdk } from '.';

export class WalletSdkUserAsset {
  constructor(private userId: Buffer, public id: AssetId, private sdk: WalletSdk) {}

  async publicBalance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).balanceOf(ethAddress);
  }

  async publicAllowance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).allowance(ethAddress);
  }

  async publicTransfer(value: bigint, signer: Signer, to: EthAddress) {
    return this.sdk.publicTransfer(this.id, this.userId, value, signer, to);
  }

  balance() {
    return this.sdk.getBalance(this.userId);
  }

  async mint(value: bigint, account: EthAddress) {
    return this.sdk.mint(this.id, this.userId, value, account);
  }

  async approve(value: bigint, account: EthAddress) {
    return this.sdk.approve(this.id, this.userId, value, account);
  }

  async deposit(value: bigint, signer: Signer, to?: GrumpkinAddress | string) {
    return this.sdk.deposit(this.id, this.userId, value, signer, to);
  }

  async withdraw(value: bigint, to: EthAddress) {
    return this.sdk.withdraw(this.id, this.userId, value, to);
  }

  async transfer(value: bigint, to: GrumpkinAddress | string) {
    return this.sdk.transfer(this.id, this.userId, value, to);
  }

  public fromErc20Units(value: bigint) {
    return this.sdk.fromErc20Units(this.id, value);
  }

  public toErc20Units(value: string) {
    return this.sdk.toErc20Units(this.id, value);
  }
}
