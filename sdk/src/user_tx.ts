import { AssetId } from './sdk';

export type UserTxAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PUBLIC_TRANSFER' | 'RECEIVE' | 'ACCOUNT';

export interface UserTx {
  txHash: Buffer;
  userId: Buffer;
  action: UserTxAction;
  assetId: AssetId;
  value: bigint;
  recipient?: Buffer;
  settled: boolean;
  created: Date;
}
