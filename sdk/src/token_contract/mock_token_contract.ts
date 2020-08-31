import { EthAddress } from 'barretenberg/address';
import { parseUnits, formatUnits } from '@ethersproject/units';
import { TokenContract } from '.';
import { randomBytes } from 'crypto';

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

  async approve(spender: EthAddress, value: bigint) {
    return randomBytes(32);
  }

  async mint(account: EthAddress, value: bigint) {
    this.balances[account.toString()] += value;
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
