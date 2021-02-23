import { TxHash, UserAccountTx, UserJoinSplitTx } from '@aztec/sdk';

export enum AccountAction {
  SHIELD = 'SHIELD',
  SEND = 'SEND',
  MERGE = 'MERGE',
}

type JoinSplitTxAction = AccountAction | 'RECEIVE';

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

const recoverJoinSplitValues = ({
  publicInput,
  publicOutput,
  privateInput,
  recipientPrivateOutput,
  senderPrivateOutput,
  ownedByUser,
}: UserJoinSplitTx) => {
  const fee = publicInput + privateInput - publicOutput - recipientPrivateOutput - senderPrivateOutput;

  const recoverTx = (action: JoinSplitTxAction, value: bigint, feeUnknown = false) => ({
    action,
    value,
    fee: feeUnknown ? 0n : fee,
    balanceDiff: (ownedByUser ? senderPrivateOutput : recipientPrivateOutput) - privateInput,
  });

  if (publicOutput) {
    return recoverTx(AccountAction.SEND, privateInput);
  }

  if (publicInput) {
    const privateOutput = recipientPrivateOutput + senderPrivateOutput;
    return recoverTx(AccountAction.SHIELD, publicInput + privateInput, !privateOutput);
  }

  if (!ownedByUser) {
    return recoverTx('RECEIVE', recipientPrivateOutput, true);
  }

  if (privateInput && senderPrivateOutput) {
    return recoverTx(AccountAction.MERGE, privateInput);
  }

  return recoverTx(AccountAction.SEND, privateInput, !recipientPrivateOutput);
};

const parseTx = (tx: UserJoinSplitTx | UserAccountTx, explorerUrl: string) => ({
  txHash: tx.txHash,
  link: `${explorerUrl}/tx/${tx.txHash.toString().replace(/^0x/i, '')}`,
  settled: tx.settled,
});

export const parseJoinSplitTx = (tx: UserJoinSplitTx, explorerUrl: string): JoinSplitTx => ({
  ...parseTx(tx, explorerUrl),
  ...recoverJoinSplitValues(tx),
});

export const parseAccountTx = (tx: UserAccountTx, explorerUrl: string): AccountTx => ({
  ...parseTx(tx, explorerUrl),
  action: 'Create Account',
});
