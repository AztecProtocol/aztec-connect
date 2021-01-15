import { AssetId } from 'barretenberg/client_proofs';
import { TxHash } from 'barretenberg/rollup_provider';
import { AccountId } from './user';

export type UserTxAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PUBLIC_TRANSFER' | 'RECEIVE' | 'ACCOUNT';

export interface UserTx {
  txHash: TxHash;
  userId: AccountId;
  action: UserTxAction;
  assetId: AssetId;
  value: bigint;
  recipient?: Buffer;
  settled: boolean;
  created: Date;
}
