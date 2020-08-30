import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { CoreSdk } from './core_sdk';
import { AssetId, SdkUserAsset } from '../sdk';

export class CoreSdkUserAsset implements SdkUserAsset {
  constructor(private ethAddress: EthAddress, private assetId: AssetId, private sdk: CoreSdk) {}

  publicBalance() {
    return this.sdk.getTokenContract(this.assetId).balanceOf(this.ethAddress);
  }

  publicAllowance() {
    return this.sdk.getTokenContract(this.assetId).allowance(this.ethAddress);
  }

  publicTransfer(value: bigint, to: EthAddress) {
    return this.sdk.publicTransfer(this.assetId, value, this.ethAddress, to);
  }

  balance() {
    return this.sdk.getBalance(this.ethAddress);
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
    return this.sdk.mint(this.assetId, value, this.ethAddress);
  }

  async approve(value: bigint) {
    return this.sdk.approve(this.assetId, value, this.ethAddress);
  }

  async deposit(value: bigint, to?: GrumpkinAddress | string) {
    return this.sdk.deposit(this.assetId, value, this.ethAddress, await this.getGrumpkinAddress(to));
  }

  async withdraw(value: bigint, to?: EthAddress) {
    return this.sdk.withdraw(this.assetId, value, this.ethAddress, to || this.ethAddress);
  }

  async transfer(value: bigint, to: GrumpkinAddress | string) {
    return this.sdk.transfer(this.assetId, value, this.ethAddress, await this.getGrumpkinAddress(to));
  }

  public fromErc20Units(value: bigint) {
    return this.sdk.getTokenContract(this.assetId).fromErc20Units(value);
  }

  public toErc20Units(value: string) {
    return this.sdk.getTokenContract(this.assetId).toErc20Units(value);
  }
}
