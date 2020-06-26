import { UserTxAction } from './database';
export { UserTxAction } from './database';

export interface UserTx {
  txHash: Buffer;
  userId: number;
  action: UserTxAction;
  value: number;
  recipient: Buffer;
  settled: boolean;
  created: Date;
  inputNote1?: number;
  inputNote2?: number;
  outputNote1?: Buffer;
  outputNote2?: Buffer;
}
