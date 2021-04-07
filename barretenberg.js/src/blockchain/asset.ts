import { EthAddress } from '../address';
import { TxHash } from '../tx_hash';
import { BlockchainAsset } from './blockchain_status';

export interface Asset {
  getStaticInfo(): BlockchainAsset;

  getUserNonce(account: EthAddress): Promise<bigint>;

  balanceOf(account: EthAddress): Promise<bigint>;

  allowance(owner: EthAddress, receiver: EthAddress): Promise<bigint>;

  approve(value: bigint, owner: EthAddress, receiver: EthAddress): Promise<TxHash>;

  mint(value: bigint, account: EthAddress): Promise<TxHash>;

  fromBaseUnits(value: bigint, precision?: number): string;

  toBaseUnits(value: string): bigint;
}
