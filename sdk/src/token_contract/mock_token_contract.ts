import { formatUnits, parseUnits } from '@ethersproject/units';
import { EthAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';
import { Signer } from '../signer';
import { TokenContract } from '.';

export class MockTokenContract implements TokenContract {
  private balances: { [key: string]: bigint } = {};

  async init() {}

  getDecimals() {
    return 2;
  }

  getAddress() {
    return EthAddress.ZERO;
  }

  async balanceOf(account: EthAddress) {
    if (this.balances[account.toString()] === undefined) {
      this.balances[account.toString()] = BigInt(100000);
    }
    return this.balances[account.toString()];
  }

  async allowance(account: EthAddress) {
    return this.balances[account.toString()] || BigInt(0);
  }

  async approve(value: bigint, signer: Signer) {
    return randomBytes(32);
  }

  async mint(value: bigint, signer: Signer) {
    const account = await signer.getAddress();
    this.balances[account] += value;
    return randomBytes(32);
  }

  public fromErc20Units(value: bigint) {
    const decimals = this.getDecimals();
    return formatUnits(value.toString(), decimals);
  }

  public toErc20Units(value: string) {
    const decimals = this.getDecimals();
    return BigInt(parseUnits(value, decimals).toString());
  }
}
