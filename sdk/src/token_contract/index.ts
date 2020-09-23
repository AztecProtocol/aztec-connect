import { EthAddress } from 'barretenberg/address';

export * from './web3_token_contract';
export * from './mock_token_contract';

type TxHash = Buffer;

export interface TokenContract {
  init(): Promise<void>;

  getDecimals(): number;

  getAddress(): EthAddress;

  balanceOf(account: EthAddress): Promise<bigint>;

  allowance(owner: EthAddress): Promise<bigint>;

  approve(value: bigint, account: EthAddress): Promise<TxHash>;

  mint(value: bigint, account: EthAddress): Promise<TxHash>;

  fromErc20Units(value: bigint): string;

  toErc20Units(value: string): bigint;
}
