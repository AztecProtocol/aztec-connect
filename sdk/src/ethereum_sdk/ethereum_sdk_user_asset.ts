import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from '../sdk';
import { Signer } from '../signer';
import { EthereumSdk } from './';

export class EthereumSdkUserAsset {
  constructor(public ethAddress: EthAddress, public id: AssetId, private sdk: EthereumSdk, public nonce: number) {}

  symbol() {
    return 'DAI';
  }

  publicBalance() {
    return this.sdk.getTokenContract(this.id).balanceOf(this.ethAddress);
  }

  publicAllowance() {
    return this.sdk.getTokenContract(this.id).allowance(this.ethAddress);
  }

  getUserPendingDeposit() {
    return this.sdk.getUserPendingDeposit(this.id, this.ethAddress);
  }

  getPermitSupport() {
    return this.sdk.getAssetPermitSupport(this.id);
  }

  balance() {
    return this.sdk.getBalance(this.id, this.ethAddress, this.nonce);
  }

  private async getGrumpkinAddress(addr?: GrumpkinAddress | string) {
    if (!addr) {
      const userData = await this.sdk.getUserData(this.ethAddress);
      return userData!.publicKey;
    }
    if (typeof addr === 'string') {
      const address = await this.sdk.getAddressFromAlias(addr);
      if (!address) {
        throw new Error(`No address found for alias: ${addr}`);
      }
      return address;
    }
    return addr;
  }

  async mint(value: bigint) {
    return this.sdk.mint(this.id, value, this.ethAddress);
  }

  async approve(value: bigint) {
    return this.sdk.approve(this.id, value, this.ethAddress);
  }

  async deposit(value: bigint, to?: GrumpkinAddress | string, signer?: Signer, toNonce?: number) {
    return this.sdk.deposit(
      this.id,
      value,
      this.ethAddress,
      await this.getGrumpkinAddress(to),
      signer,
      to || toNonce !== undefined ? toNonce : this.nonce,
    );
  }

  async withdraw(value: bigint, to?: EthAddress, signer?: Signer) {
    return this.sdk.withdraw(this.id, value, this.ethAddress, to || this.ethAddress, signer, this.nonce);
  }

  async transfer(value: bigint, to: GrumpkinAddress | string, signer?: Signer, toNonce?: number) {
    return this.sdk.transfer(
      this.id,
      value,
      this.ethAddress,
      await this.getGrumpkinAddress(to),
      signer,
      this.nonce,
      toNonce,
    );
  }

  public fromErc20Units(value: bigint, precision?: number) {
    return this.sdk.getTokenContract(this.id).fromErc20Units(value, precision);
  }

  public toErc20Units(value: string) {
    return this.sdk.getTokenContract(this.id).toErc20Units(value);
  }
}
