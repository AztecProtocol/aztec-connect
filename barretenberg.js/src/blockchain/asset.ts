import { EthAddress } from '../address';
import { SendTxOptions } from './blockchain';
import { BlockchainAsset } from './blockchain_status';
import { TxHash } from './tx_hash';

export interface Asset {
  getStaticInfo(): BlockchainAsset;

  getUserNonce(account: EthAddress): Promise<bigint>;

  balanceOf(account: EthAddress): Promise<bigint>;

  allowance(owner: EthAddress, receiver: EthAddress): Promise<bigint>;

  approve(value: bigint, owner: EthAddress, receiver: EthAddress, options?: SendTxOptions): Promise<TxHash>;

  mint(value: bigint, account: EthAddress, options?: SendTxOptions): Promise<TxHash>;

  transfer(value: bigint, from: EthAddress, to: EthAddress, options?: SendTxOptions): Promise<TxHash>;

  fromBaseUnits(value: bigint, precision?: number): string;

  toBaseUnits(value: string): bigint;
}
