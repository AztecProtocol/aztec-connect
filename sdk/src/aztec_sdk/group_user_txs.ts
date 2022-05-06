import { AssetValue } from '@aztec/barretenberg/asset';
import { virtualAssetIdFlag } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../core_tx';
import {
  UserAccountTx,
  UserDefiClaimTx,
  UserDefiInteractionResultState,
  UserDefiTx,
  UserPaymentTx,
  UserTx,
} from '../user_tx';

const emptyAssetValue = { assetId: 0, value: BigInt(0) };

const toUserAccountTx = (
  { txId, userId, aliasHash, newSigningPubKey1, newSigningPubKey2, migrated, created, settled }: CoreAccountTx,
  fee: AssetValue,
) => new UserAccountTx(txId, userId, aliasHash, newSigningPubKey1, newSigningPubKey2, migrated, fee, created, settled);

const toUserPaymentTx = (
  { txId, userId, proofId, publicOwner, isSender, created, settled }: CorePaymentTx,
  value: AssetValue,
  fee: AssetValue,
) => {
  return new UserPaymentTx(txId, userId, proofId, value, fee, publicOwner, isSender, created, settled);
};

const getUserDefiInteractionResultState = ({ settled, finalised, claimSettled }: CoreDefiTx) => {
  if (claimSettled) {
    return UserDefiInteractionResultState.SETTLED;
  }
  if (finalised) {
    return UserDefiInteractionResultState.AWAITING_SETTLEMENT;
  }
  if (settled) {
    return UserDefiInteractionResultState.AWAITING_FINALISATION;
  }
  return UserDefiInteractionResultState.PENDING;
};

const toUserDefiTx = (tx: CoreDefiTx, fee: AssetValue) => {
  const {
    txId,
    userId,
    bridgeId,
    depositValue,
    created,
    settled,
    interactionNonce,
    isAsync,
    success,
    outputValueA,
    outputValueB,
    finalised,
    claimSettled,
  } = tx;
  const state = getUserDefiInteractionResultState(tx);
  return new UserDefiTx(
    txId,
    userId,
    bridgeId,
    { assetId: bridgeId.inputAssetIdA, value: depositValue },
    fee,
    created,
    settled,
    {
      state,
      isAsync,
      interactionNonce,
      success,
      outputValueA:
        outputValueA !== undefined
          ? {
              assetId: bridgeId.firstOutputVirtual ? interactionNonce! + virtualAssetIdFlag : bridgeId.outputAssetIdA,
              value: outputValueA,
            }
          : undefined,
      outputValueB:
        outputValueB !== undefined && bridgeId.outputAssetIdB !== undefined
          ? {
              assetId: bridgeId.secondOutputVirtual ? interactionNonce! + virtualAssetIdFlag : bridgeId.outputAssetIdB,
              value: outputValueB,
            }
          : undefined,
      claimSettled,
      finalised,
    },
  );
};

const toUserDefiClaimTx = (
  claimTxId: TxId | undefined,
  {
    txId,
    userId,
    bridgeId,
    depositValue,
    interactionResult: { success, outputValueA, outputValueB, claimSettled },
  }: UserDefiTx,
) =>
  new UserDefiClaimTx(
    claimTxId,
    txId,
    userId,
    bridgeId,
    depositValue,
    success!,
    outputValueA!,
    outputValueB,
    claimSettled,
  );

const getPaymentValue = ({
  proofId,
  assetId,
  publicValue,
  privateInput,
  recipientPrivateOutput,
  senderPrivateOutput,
  isRecipient,
}: CorePaymentTx) => {
  const value = (() => {
    switch (proofId) {
      case ProofId.DEPOSIT: {
        const outputValue = recipientPrivateOutput + senderPrivateOutput;
        return outputValue || isRecipient ? outputValue : publicValue;
      }
      case ProofId.WITHDRAW:
        return publicValue;
      case ProofId.SEND:
        if (isRecipient || recipientPrivateOutput) {
          return recipientPrivateOutput;
        }
        return privateInput;
    }
  })();
  return { assetId, value };
};

const getFee = (tx: CoreUserTx) => {
  if (tx.proofId === ProofId.ACCOUNT) {
    return emptyAssetValue;
  }

  if (tx.proofId === ProofId.DEFI_DEPOSIT) {
    const { bridgeId, txFee } = tx;
    return { assetId: bridgeId.inputAssetIdA, value: txFee };
  }

  const {
    proofId,
    assetId,
    publicValue,
    privateInput,
    recipientPrivateOutput,
    senderPrivateOutput,
    isRecipient,
    isSender,
  } = tx;
  const value = (() => {
    switch (proofId) {
      case ProofId.DEPOSIT: {
        const outputValue = recipientPrivateOutput + senderPrivateOutput;
        return outputValue || (isSender && isRecipient) ? publicValue - outputValue : BigInt(0);
      }
      case ProofId.WITHDRAW:
        return privateInput - publicValue;
      case ProofId.SEND:
        if (!isSender || (!isRecipient && !recipientPrivateOutput)) {
          return BigInt(0);
        }
        return privateInput - recipientPrivateOutput - senderPrivateOutput;
    }
  })();
  return {
    assetId,
    value,
  };
};

const getTotalFee = (txs: CoreUserTx[]) => {
  if (!txs.length) {
    return emptyAssetValue;
  }

  const fees = txs.map(getFee);
  const { assetId } = fees.find(fee => fee.value) || fees[0];
  if (fees.some(fee => fee.value && fee.assetId !== assetId)) {
    throw new Error('Inconsistent fee paying assets.');
  }

  return { assetId, value: fees.reduce((sum, fee) => sum + fee.value, BigInt(0)) };
};

const getPrimaryTx = (txs: CoreUserTx[]) =>
  txs.find(tx => !tx.txRefNo) ||
  txs.find(tx => [ProofId.ACCOUNT, ProofId.DEFI_DEPOSIT, ProofId.DEPOSIT, ProofId.WITHDRAW].includes(tx.proofId)) ||
  txs.find(tx => tx.proofId === ProofId.SEND && !tx.isSender) ||
  txs.find(tx => !getFee(tx).value);

const toUserTx = (txs: CoreUserTx[]) => {
  const primaryTx = getPrimaryTx(txs);
  if (!primaryTx) {
    return;
  }

  const fee = getTotalFee(txs);
  switch (primaryTx.proofId) {
    case ProofId.ACCOUNT: {
      const depositTx = txs.find(tx => tx.proofId === ProofId.DEPOSIT) as CorePaymentTx;
      const depositValue = depositTx ? getPaymentValue(depositTx) : emptyAssetValue;
      if (depositValue.value) {
        return [toUserAccountTx(primaryTx, emptyAssetValue), toUserPaymentTx(depositTx, depositValue, fee)];
      }
      return [toUserAccountTx(primaryTx, fee)];
    }
    case ProofId.DEFI_DEPOSIT: {
      const userDefiTx = toUserDefiTx(primaryTx, fee);
      if (userDefiTx.interactionResult.finalised) {
        return [userDefiTx, toUserDefiClaimTx(primaryTx.claimTxId, userDefiTx)];
      }
      return [userDefiTx];
    }
    default: {
      const value = getPaymentValue(primaryTx);
      return [toUserPaymentTx(primaryTx, value, fee)];
    }
  }
};

const groupTxsByTxRefNo = (txs: CoreUserTx[]) => {
  const txGroups: Map<number, CoreUserTx[]> = new Map();
  for (const tx of txs) {
    const { txRefNo } = tx;
    if (!txRefNo) {
      // If txRefNo is 0, this tx is not part of a tx group.
      txGroups.set(tx.txId.toBuffer().readUInt32BE(0), [tx]);
    } else {
      const group = txGroups.get(txRefNo) || [];
      txGroups.set(txRefNo, [...group, tx]);
    }
  }
  return [...txGroups.values()];
};

const filterUndefined = <T>(ts: (T | undefined)[]): T[] => ts.filter((t: T | undefined): t is T => !!t);

const bySettled = (tx1: UserTx, tx2: UserTx) => {
  if (tx1.settled && tx2.settled) return tx2.settled.getTime() - tx1.settled.getTime();
  if (!tx1.settled && !tx2.settled) return 0;
  if (!tx1.settled) return -1;
  if (!tx2.settled) return 1;

  return 0;
};

export const groupUserTxs = (txs: CoreUserTx[]) => {
  const txGroups = groupTxsByTxRefNo(txs);
  return filterUndefined(txGroups.map(txs => toUserTx(txs)))
    .flat()
    .sort(bySettled);
};
