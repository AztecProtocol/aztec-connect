import { EthAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';

export * from './web3_token_contract';
export * from './mock_token_contract';

export interface TokenContract {
  init(): Promise<void>;

  getName(): string;

  getSymbol(): string;

  getDecimals(): number;

  getAddress(): EthAddress;

  balanceOf(account: EthAddress): Promise<bigint>;

  allowance(owner: EthAddress): Promise<bigint>;

  approve(value: bigint, account: EthAddress): Promise<TxHash>;

  mint(value: bigint, account: EthAddress): Promise<TxHash>;

  fromBaseUnits(value: bigint, precision?: number): string;

  toBaseUnits(value: string): bigint;
}
