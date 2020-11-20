import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from '../sdk';
import { EthereumSigner, Signer } from '../signer';
import { UserId } from '../user';
import { WalletSdk } from '.';
import { PermitArgs } from 'blockchain';

export class WalletSdkUserAsset {
  constructor(public userId: UserId, public id: AssetId, private sdk: WalletSdk) {}

  async publicBalance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).balanceOf(ethAddress);
  }

  async publicAllowance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).allowance(ethAddress);
  }

  balance() {
    return this.sdk.getBalance(this.id, this.userId.publicKey, this.userId.nonce);
  }

  async mint(value: bigint, account: EthAddress) {
    return this.sdk.mint(this.id, this.userId.publicKey, value, account);
  }

  async approve(value: bigint, account: EthAddress) {
    return this.sdk.approve(this.id, this.userId.publicKey, value, account);
  }

  async deposit(
    value: bigint,
    signer: Signer,
    ethSigner: EthereumSigner,
    permitArgs: PermitArgs,
    to?: GrumpkinAddress | string,
    toNonce?: number,
  ) {
    return this.sdk.deposit(
      this.id,
      this.userId.publicKey,
      value,
      signer,
      ethSigner,
      permitArgs,
      to,
      to || toNonce !== undefined ? toNonce : this.userId.nonce,
    );
  }

  async withdraw(value: bigint, signer: Signer, to: EthAddress) {
    return this.sdk.withdraw(this.id, this.userId.publicKey, value, signer, to, this.userId.nonce);
  }

  async transfer(value: bigint, signer: Signer, to: GrumpkinAddress | string, toNonce?: number) {
    return this.sdk.transfer(this.id, this.userId.publicKey, value, signer, to, this.userId.nonce, toNonce);
  }

  public fromErc20Units(value: bigint, precision?: number) {
    return this.sdk.fromErc20Units(this.id, value, precision);
  }

  public toErc20Units(value: string) {
    return this.sdk.toErc20Units(this.id, value);
  }
}
