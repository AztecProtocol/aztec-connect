import { ProofId, TxHash, UserAccountTx, UserPaymentTx } from '@aztec/sdk';

export enum AccountAction {
  SHIELD = 'SHIELD',
  SEND = 'SEND',
  MERGE = 'MERGE',
  MIGRATE_OLD_BALANCE = 'MIGRATE_OLD_BALANCE',
  MIGRATE_FORGOTTON_BALANCE = 'MIGRATE_FORGOTTON_BALANCE',
}

type JoinSplitTxAction = AccountAction | 'RECEIVE';

const getTxAction = ({ proofId, isSender }: UserPaymentTx): JoinSplitTxAction => {
  if (!isSender) {
    return 'RECEIVE';
  }
  switch (proofId) {
    case ProofId.DEPOSIT:
      return AccountAction.SHIELD;
    default:
      return AccountAction.SEND;
  }
};

const getBalanceDiff = ({ proofId, isSender, value: { value }, fee: { value: fee } }: UserPaymentTx) => {
  if (!isSender) {
    return value;
  }
  switch (proofId) {
    case ProofId.DEPOSIT:
      return value;
    default:
      return -(value + fee);
  }
};

export interface JoinSplitTx {
  txHash: TxHash;
  action: JoinSplitTxAction;
  balanceDiff: bigint;
  value: bigint;
  fee: bigint;
  link: string;
  settled?: Date;
}

export interface AccountTx {
  txHash: TxHash;
  action: string;
  link: string;
  settled?: Date;
}

const recoverJoinSplitValues = (tx: UserPaymentTx) => {
  const { value, fee } = tx;
  return { action: getTxAction(tx), value: value.value, fee: fee.value, balanceDiff: getBalanceDiff(tx) };
};

const parseTx = (tx: UserPaymentTx | UserAccountTx, explorerUrl: string) => ({
  txHash: tx.txHash,
  link: `${explorerUrl}/tx/${tx.txHash.toString().replace(/^0x/i, '')}`,
  settled: tx.settled,
});

export const parseJoinSplitTx = (tx: UserPaymentTx, explorerUrl: string): JoinSplitTx => ({
  ...parseTx(tx, explorerUrl),
  ...recoverJoinSplitValues(tx),
});

export const parseAccountTx = (tx: UserAccountTx, explorerUrl: string): AccountTx => ({
  ...parseTx(tx, explorerUrl),
  action: 'Create Account',
});
