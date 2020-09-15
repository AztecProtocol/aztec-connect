import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { CoreSdk } from './core_sdk';
import { AssetId, SdkUserAsset } from '../sdk';

export class CoreSdkUserAsset implements SdkUserAsset {
  constructor(private userId: Buffer, private assetId: AssetId, private sdk: CoreSdk) {}

  publicBalance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.assetId).balanceOf(ethAddress);
  }

  publicAllowance(ethAddress: EthAddress) {
    return this.sdk.getTokenContract(this.assetId).allowance(ethAddress);
  }

  publicTransfer(value: bigint, from: EthAddress, to: EthAddress) {
    return this.sdk.publicTransfer(this.assetId, this.userId, value, from, to);
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

  async mint(value: bigint, from: EthAddress) {
    return this.sdk.mint(this.assetId, this.userId, value, from);
  }

  async approve(value: bigint, from: EthAddress) {
    return this.sdk.approve(this.assetId, this.userId, value, from);
  }

  async deposit(value: bigint, from: EthAddress, to?: GrumpkinAddress | string) {
    return this.sdk.deposit(this.assetId, this.userId, value, from, await this.getGrumpkinAddress(to));
  }

  async withdraw(value: bigint, to: EthAddress) {
    return this.sdk.withdraw(this.assetId, this.userId, value, to);
  }

  async transfer(value: bigint, to: GrumpkinAddress | string) {
    return this.sdk.transfer(this.assetId, this.userId, value, await this.getGrumpkinAddress(to));
  }

  public fromErc20Units(value: bigint) {
    return this.sdk.getTokenContract(this.assetId).fromErc20Units(value);
  }

  public toErc20Units(value: string) {
    return this.sdk.getTokenContract(this.assetId).toErc20Units(value);
  }
}
