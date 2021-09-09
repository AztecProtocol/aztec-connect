import { randomBytes } from 'crypto';
import { EthAddress } from '../address';
import { ProofId } from '../client_proofs/proof_data';
import { ViewingKey } from '../viewing_key';
import { InnerProofData, RollupProofData } from './';

export const randomDepositProofData = () =>
  new InnerProofData(
    ProofId.JOIN_SPLIT,
    randomBytes(32),
    Buffer.alloc(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    EthAddress.randomAddress().toBuffer32(),
    Buffer.alloc(32),
  );

export const randomSendProofData = () =>
  new InnerProofData(
    ProofId.JOIN_SPLIT,
    Buffer.alloc(32),
    Buffer.alloc(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    Buffer.alloc(32),
    Buffer.alloc(32),
  );

export const randomWithdrawProofData = () =>
  new InnerProofData(
    ProofId.JOIN_SPLIT,
    Buffer.alloc(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    Buffer.alloc(32),
    EthAddress.randomAddress().toBuffer32(),
  );

export const randomInnerProofData = (proofId = ProofId.JOIN_SPLIT) => {
  switch (proofId) {
    case ProofId.JOIN_SPLIT:
      return [randomDepositProofData(), randomSendProofData(), randomWithdrawProofData()][
        Math.floor(Math.random() * 3)
      ];
    default:
      return new InnerProofData(
        proofId,
        [ProofId.DEFI_DEPOSIT, ProofId.DEFI_CLAIM].includes(proofId) ? Buffer.alloc(32) : randomBytes(32),
        proofId === ProofId.DEFI_CLAIM ? Buffer.alloc(32) : randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        proofId === ProofId.DEFI_CLAIM ? Buffer.alloc(32) : randomBytes(32),
        randomBytes(32),
        [ProofId.DEFI_DEPOSIT, ProofId.DEFI_CLAIM].includes(proofId) ? Buffer.alloc(32) : randomBytes(32),
      );
  }
};

export const createRollupProofData = (innerProofs: InnerProofData[], viewingKeys: ViewingKey[][] = []) => {
  const bridgeIds = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
  const defiDepositSums = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
  const defiInteractionNotes = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
  const assetIds = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
  const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => randomBytes(32));
  return new RollupProofData(
    randomBytes(4).readUInt32BE(0),
    innerProofs.length,
    randomBytes(4).readUInt32BE(0),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    bridgeIds,
    defiDepositSums,
    assetIds,
    totalTxFees,
    defiInteractionNotes,
    randomBytes(32),
    randomBytes(32),
    innerProofs,
    viewingKeys,
  );
};
