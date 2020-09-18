import { EthAddress } from 'barretenberg/address';
import { Signer } from 'ethers';

export * from './web3_token_contract';
export * from './mock_token_contract';

type TxHash = Buffer;

export interface TokenContract {
  init(): Promise<void>;

  getDecimals(): number;

  getAddress(): EthAddress;

  balanceOf(account: EthAddress): Promise<bigint>;

  allowance(owner: EthAddress): Promise<bigint>;

  approve(value: bigint, signer: Signer): Promise<TxHash>;

  mint(value: bigint, signer: Signer): Promise<TxHash>;

  fromErc20Units(value: bigint): string;

  toErc20Units(value: string): bigint;
}
