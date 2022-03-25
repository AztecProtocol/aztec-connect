import { AssetValue } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../core_tx';
import { UserAccountTx, UserDefiInteractionResultState, UserDefiTx, UserPaymentTx } from '../user_tx';

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
    claimSettled,
    {
      state,
      isAsync,
      interactionNonce,
      success,
      outputValueA,
      outputValueB,
      deposited: settled,
      finalised,
    },
  );
};

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

  // If there's a defi deposit tx, the fee is stored in its offchain data.
  // We don't need to add up the fee paid by the join split tx unless its input asset is a garbage asset.
  const defiTx = txs.find(tx => tx.proofId === ProofId.DEFI_DEPOSIT) as CoreDefiTx;
  const feeTxs = !defiTx
    ? txs
    : txs.filter(tx => tx === defiTx || (tx.proofId === ProofId.SEND && tx.assetId !== defiTx.bridgeId.inputAssetIdA));
  const fees = feeTxs.map(getFee);
  const { assetId } = fees.find(fee => fee.value) || fees[0];
  if (fees.some(fee => fee.value && fee.assetId !== assetId)) {
    throw new Error('Inconsistent fee paying assets.');
  }

  return { assetId, value: fees.reduce((sum, fee) => sum + fee.value, BigInt(0)) };
};

const getPrimaryTx = (txs: CoreUserTx[], feePayingAssetIds: number[]) =>
  txs.find(tx => !tx.txRefNo) ||
  txs.find(tx => [ProofId.ACCOUNT, ProofId.DEFI_DEPOSIT].includes(tx.proofId)) ||
  txs.find(tx => tx.proofId === ProofId.SEND && !tx.isSender) ||
  txs.find(tx => [ProofId.DEPOSIT, ProofId.WITHDRAW].includes(tx.proofId)) ||
  txs.find(tx => !feePayingAssetIds.includes((tx as CorePaymentTx).assetId));

const toUserTx = (txs: CoreUserTx[], feePayingAssetIds: number[]) => {
  const primaryTx = getPrimaryTx(txs, feePayingAssetIds);
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
      return [toUserDefiTx(primaryTx, fee)];
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

export const groupUserTxs = (txs: CoreUserTx[], feePayingAssetIds: number[]) => {
  const txGroups = groupTxsByTxRefNo(txs);
  return filterUndefined(txGroups.map(txs => toUserTx(txs, feePayingAssetIds))).flat();
};
