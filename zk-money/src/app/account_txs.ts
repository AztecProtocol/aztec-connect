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

const recoverJoinSplitValues = (
  {
    publicInput,
    publicOutput,
    privateInput,
    recipientPrivateOutput,
    senderPrivateOutput,
    ownedByUser,
  }: UserJoinSplitTx,
  minFee: bigint,
) => {
  const fee = publicInput + privateInput - publicOutput - recipientPrivateOutput - senderPrivateOutput;
  const balanceDiff = (ownedByUser ? senderPrivateOutput : recipientPrivateOutput) - privateInput;

  const recoverTx = (action: JoinSplitTxAction, value: bigint, feeUnknown = false) => ({
    action,
    value,
    fee: feeUnknown ? 0n : fee,
    balanceDiff,
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

  // TODO - find a better way to distinguish merge and send
  // For now, if the derived fee is larger than the current minFee, it's probably a send tx after a hard sync.
  // But...
  // A merge tx would be mistaken as send if the user paid higher fee or the min fee has dropped.
  // A send tx after a hard sync would be mistaken as merge if the sent amount plus the old fee is less than the current min fee.
  if (!recipientPrivateOutput && fee <= minFee) {
    return recoverTx(AccountAction.MERGE, privateInput);
  }

  return recoverTx(AccountAction.SEND, privateInput, !recipientPrivateOutput);
};

const parseTx = (tx: UserJoinSplitTx | UserAccountTx, explorerUrl: string) => ({
  txHash: tx.txHash,
  link: `${explorerUrl}/tx/${tx.txHash.toString().replace(/^0x/i, '')}`,
  settled: tx.settled,
});

export const parseJoinSplitTx = (tx: UserJoinSplitTx, explorerUrl: string, minFee: bigint): JoinSplitTx => ({
  ...parseTx(tx, explorerUrl),
  ...recoverJoinSplitValues(tx, minFee),
});

export const parseAccountTx = (tx: UserAccountTx, explorerUrl: string): AccountTx => ({
  ...parseTx(tx, explorerUrl),
  action: 'Create Account',
});
