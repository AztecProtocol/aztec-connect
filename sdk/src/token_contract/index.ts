import { EthAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';

export * from './web3_token_contract';
export * from './mock_token_contract';

export interface TokenContract {
  init(): Promise<void>;

  getDecimals(): number;

  getAddress(): EthAddress;

  balanceOf(account: EthAddress): Promise<bigint>;

  allowance(owner: EthAddress): Promise<bigint>;

  approve(value: bigint, account: EthAddress): Promise<TxHash>;

  mint(value: bigint, account: EthAddress): Promise<TxHash>;

  name(): Promise<string>;

  fromErc20Units(value: bigint, precision?: number): string;

  toErc20Units(value: string): bigint;
}
