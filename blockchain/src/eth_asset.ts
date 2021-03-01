import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { fromBaseUnits, toBaseUnits } from './units';
import { Asset } from 'barretenberg/blockchain';
import { TxHash } from 'barretenberg/tx_hash';

/* eslint-disable @typescript-eslint/no-unused-vars */

export class EthAsset implements Asset {
  private precision = 6;

  constructor(private provider: Web3Provider) {}

  getStaticInfo() {
    return {
      address: EthAddress.ZERO,
      name: 'Eth',
      symbol: 'ETH',
      decimals: 18,
      permitSupport: false,
      gasConstants: [5000, 0, 5000, 30000],
    };
  }

  async getUserNonce(account: EthAddress) {
    return BigInt(0);
  }

  async balanceOf(account: EthAddress) {
    return BigInt(await this.provider.getBalance(account.toString()));
  }

  async allowance(owner: EthAddress, receiver: EthAddress): Promise<bigint> {
    throw new Error('Allowance unsupported for ETH.');
  }

  async approve(value: bigint, owner: EthAddress, receiver: EthAddress): Promise<TxHash> {
    throw new Error('Approve unsupported for ETH.');
  }

  async mint(value: bigint, account: EthAddress): Promise<TxHash> {
    throw new Error('Mint unsupported for ETH.');
  }

  public fromBaseUnits(value: bigint, precision = this.precision) {
    return fromBaseUnits(value, 18, precision);
  }

  public toBaseUnits(value: string) {
    return toBaseUnits(value, 18);
  }
}
