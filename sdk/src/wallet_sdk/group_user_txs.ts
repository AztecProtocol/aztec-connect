import { AssetValue } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../core_tx';
import { UserAccountTx, UserDefiTx, UserPaymentTx } from '../user_tx';

const emptyValue = { assetId: 0, value: BigInt(0) };

const toUserAccountTx = (
  { txHash, userId, aliasHash, newSigningPubKey1, newSigningPubKey2, migrated, created, settled }: CoreAccountTx,
  deposit: AssetValue,
  fee: AssetValue,
) =>
  new UserAccountTx(
    txHash,
    userId,
    aliasHash,
    newSigningPubKey1,
    newSigningPubKey2,
    migrated,
    deposit,
    fee,
    created,
    settled,
  );

const toUserPaymentTx = (
  { txHash, userId, proofId, publicOwner, isSender, created, settled }: CorePaymentTx,
  value: AssetValue,
  fee: AssetValue,
) => {
  return new UserPaymentTx(txHash, userId, proofId, value, fee, publicOwner, isSender, created, settled);
};

const toUserDefiTx = (
  { txHash, userId, bridgeId, depositValue, outputValueA, outputValueB, result, created, settled }: CoreDefiTx,
  fee: AssetValue,
) =>
  new UserDefiTx(
    txHash,
    userId,
    bridgeId,
    { assetId: bridgeId.inputAssetId, value: depositValue },
    fee,
    outputValueA,
    outputValueB,
    result,
    created,
    settled,
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
      case ProofId.DEPOSIT:
        return recipientPrivateOutput || senderPrivateOutput || publicValue;
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
    return emptyValue;
  }

  if (tx.proofId === ProofId.DEFI_DEPOSIT) {
    const { bridgeId, txFee } = tx;
    return { assetId: bridgeId.inputAssetId, value: txFee };
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
        return outputValue ? publicValue - outputValue : BigInt(0);
      }
      case ProofId.WITHDRAW:
        return isSender ? privateInput - publicValue : BigInt(0);
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
  const fees = txs.map(getFee);
  if (!fees.length) {
    return emptyValue;
  }

  const { assetId } = fees.find(fee => fee.value) || fees[0];
  if (fees.some(fee => fee.value && fee.assetId !== assetId)) {
    throw new Error('Inconsistent fee paying assets.');
  }

  return { assetId, value: fees.reduce((sum, fee) => sum + fee.value, BigInt(0)) };
};

const isFeeTx = (tx: CoreUserTx) => tx.proofId === ProofId.SEND && tx.isRecipient && tx.isSender;

const toUserTx = (txs: CoreUserTx[]) => {
  const primaryTx =
    txs.find(tx => [ProofId.ACCOUNT, ProofId.DEFI_DEPOSIT].includes(tx.proofId)) || txs.find(tx => !isFeeTx(tx));
  if (!primaryTx) {
    return;
  }

  const fee = getTotalFee(txs);
  switch (primaryTx.proofId) {
    case ProofId.ACCOUNT: {
      const depositTx = txs.find(tx => tx.proofId === ProofId.DEPOSIT);
      const deposit = depositTx ? getPaymentValue(depositTx as CorePaymentTx) : emptyValue;
      return toUserAccountTx(primaryTx, deposit, fee);
    }
    case ProofId.DEFI_DEPOSIT: {
      return toUserDefiTx(primaryTx, fee);
    }
    default: {
      const value = getPaymentValue(primaryTx);
      return toUserPaymentTx(primaryTx, value, fee);
    }
  }
};

const groupTxsByTxRefNo = (txs: CoreUserTx[]) => {
  const txGroups: Map<number, CoreUserTx[]> = new Map();
  for (const tx of txs) {
    const { txRefNo } = tx;
    if (!txRefNo) {
      // If txRefNo is 0, this tx is not part of a tx group.
      txGroups.set(tx.txHash.toBuffer().readUInt32BE(0), [tx]);
    } else {
      const group = txGroups.get(txRefNo) || [];
      txGroups.set(txRefNo, [...group, tx]);
    }
  }
  return [...txGroups.values()];
};

const filterUndefined = <T>(ts: (T | undefined)[]): T[] => ts.filter((t: T | undefined): t is T => !!t);

export const groupUserTxs = (txs: CoreUserTx[]) => {
  const txGroups = groupTxsByTxRefNo(txs);
  return filterUndefined(txGroups.map(toUserTx));
};
