import { EthAddress } from 'barretenberg/address';

export type UserTxAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PUBLIC_TRANSFER' | 'RECEIVE' | 'ACCOUNT';

export interface UserTx {
  txHash: Buffer;
  ethAddress: EthAddress;
  action: UserTxAction;
  value: bigint;
  recipient?: Buffer;
  settled: boolean;
  created: Date;
}
