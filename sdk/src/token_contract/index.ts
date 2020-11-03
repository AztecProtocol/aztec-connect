import { EthAddress } from 'barretenberg/address';

export * from './web3_token_contract';
export * from './mock_token_contract';

/**
 * TransactionHash is a 32-byte hash from a
 * <a href="https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt" target="_blank">transaction receipt</a>.
 */
type TransactionHash = Buffer;

export interface TokenContract {
  init(): Promise<void>;

  getDecimals(): number;

  getAddress(): EthAddress;

  balanceOf(account: EthAddress): Promise<bigint>;

  allowance(owner: EthAddress): Promise<bigint>;

  approve(value: bigint, account: EthAddress): Promise<TransactionHash>;

  mint(value: bigint, account: EthAddress): Promise<TransactionHash>;

  name(): Promise<string>;

  fromErc20Units(value: bigint, precision?: number): string;

  toErc20Units(value: string): bigint;
}
