import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { Signer } from 'ethers';
import { AssetId } from '../sdk';
import { WalletSdk } from '.';

export class WalletSdkUserAsset {
  constructor(private userId: Buffer, public id: AssetId, private sdk: WalletSdk) {}

  publicBalance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).balanceOf(ethAddress);
  }

  publicAllowance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.id).allowance(ethAddress);
  }

  publicTransfer(value: bigint, signer: Signer, to: EthAddress) {
    return this.sdk.publicTransfer(this.id, this.userId, value, signer, to);
  }

  balance() {
    return this.sdk.getBalance(this.userId);
  }

  private async getGrumpkinAddress(addr?: GrumpkinAddress | string) {
    if (!addr) {
      const userData = await this.sdk.getUserData(this.userId);
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

  async mint(value: bigint, signer: Signer) {
    return this.sdk.mint(this.id, this.userId, value, signer);
  }

  async approve(value: bigint, signer: Signer) {
    return this.sdk.approve(this.id, this.userId, value, signer);
  }

  async deposit(value: bigint, signer: Signer, to?: GrumpkinAddress | string) {
    return this.sdk.deposit(this.id, this.userId, value, signer, await this.getGrumpkinAddress(to));
  }

  async withdraw(value: bigint, to: EthAddress) {
    return this.sdk.withdraw(this.id, this.userId, value, to);
  }

  async transfer(value: bigint, to: GrumpkinAddress | string) {
    return this.sdk.transfer(this.id, this.userId, value, await this.getGrumpkinAddress(to));
  }

  public fromErc20Units(value: bigint) {
    return this.sdk.getTokenContract(this.id).fromErc20Units(value);
  }

  public toErc20Units(value: string) {
    return this.sdk.getTokenContract(this.id).toErc20Units(value);
  }
}
