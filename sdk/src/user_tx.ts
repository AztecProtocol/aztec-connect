import { TxHash } from 'barretenberg/rollup_provider';
import { AssetId } from './sdk';
import { UserId } from './user';

export type UserTxAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PUBLIC_TRANSFER' | 'RECEIVE' | 'ACCOUNT';

export interface UserTx {
  txHash: TxHash;
  userId: UserId;
  action: UserTxAction;
  assetId: AssetId;
  value: bigint;
  recipient?: Buffer;
  settled: boolean;
  created: Date;
}
