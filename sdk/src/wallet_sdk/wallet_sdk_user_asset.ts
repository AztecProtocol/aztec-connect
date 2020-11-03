import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';
import { AssetId } from '../sdk';
import { EthereumSigner, Signer } from '../signer';
import { WalletSdk } from '.';
import { PermitArgs } from 'blockchain';

export class WalletSdkUserAsset {
  constructor(private userId: Buffer, public id: AssetId, private sdk: WalletSdk) {}

  async publicBalance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).balanceOf(ethAddress);
  }

  async publicAllowance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).allowance(ethAddress);
  }

  balance() {
    return this.sdk.getBalance(this.userId, this.id);
  }

  async mint(value: bigint, account: EthAddress): Promise<TxHash> {
    return this.sdk.mint(this.id, this.userId, value, account);
  }

  async approve(value: bigint, account: EthAddress): Promise<TxHash> {
    return this.sdk.approve(this.id, this.userId, value, account);
  }

  async deposit(
    value: bigint,
    signer: Signer,
    ethSigner: EthereumSigner,
    permitArgs: PermitArgs,
    to?: GrumpkinAddress | string,
  ): Promise<TxHash> {
    return this.sdk.deposit(this.id, this.userId, value, signer, ethSigner, permitArgs, to);
  }

  async withdraw(value: bigint, signer: Signer, to: EthAddress): Promise<TxHash> {
    return this.sdk.withdraw(this.id, this.userId, value, signer, to);
  }

  async transfer(value: bigint, signer: Signer, to: GrumpkinAddress | string): Promise<TxHash> {
    return this.sdk.transfer(this.id, this.userId, value, signer, to);
  }

  public fromErc20Units(value: bigint, precision?: number) {
    return this.sdk.fromErc20Units(this.id, value, precision);
  }

  public toErc20Units(value: string) {
    return this.sdk.toErc20Units(this.id, value);
  }
}
