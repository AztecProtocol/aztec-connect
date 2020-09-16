export type UserTxAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PUBLIC_TRANSFER' | 'RECEIVE' | 'ACCOUNT';

export interface UserTx {
  txHash: Buffer;
  userId: Buffer;
  action: UserTxAction;
  value: bigint;
  recipient?: Buffer;
  settled: boolean;
  created: Date;
}
