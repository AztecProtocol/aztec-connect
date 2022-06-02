import { randomBytes } from 'crypto';
import { EthAddress } from '../address';
import { ProofId } from '../client_proofs/proof_data';
import { InnerProofData, RollupProofData } from './';

const randomCommitment = () => randomBytes(32);
const randomNullifier = () => randomBytes(32);
const randomInt = () => Buffer.concat([Buffer.alloc(28), randomBytes(4)]);

export const randomDepositProofData = () =>
  new InnerProofData(
    ProofId.DEPOSIT,
    randomCommitment(),
    randomCommitment(),
    randomNullifier(),
    randomNullifier(),
    randomInt(),
    EthAddress.random().toBuffer32(),
    Buffer.alloc(32),
  );

export const randomSendProofData = () =>
  new InnerProofData(
    ProofId.SEND,
    randomCommitment(),
    randomCommitment(),
    randomNullifier(),
    randomNullifier(),
    Buffer.alloc(32),
    Buffer.alloc(32),
    Buffer.alloc(32),
  );

export const randomWithdrawProofData = () =>
  new InnerProofData(
    ProofId.WITHDRAW,
    randomCommitment(),
    randomCommitment(),
    randomNullifier(),
    randomNullifier(),
    randomInt(),
    EthAddress.random().toBuffer32(),
    randomInt(),
  );

export const randomInnerProofData = (proofId = ProofId.SEND) => {
  switch (proofId) {
    case ProofId.DEPOSIT:
      return randomDepositProofData();
    case ProofId.WITHDRAW:
      return randomWithdrawProofData();
    case ProofId.SEND:
      return randomSendProofData();
    default:
      return new InnerProofData(
        proofId,
        randomCommitment(),
        randomCommitment(),
        randomNullifier(),
        [ProofId.ACCOUNT, ProofId.DEFI_DEPOSIT].includes(proofId) ? randomNullifier() : Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
      );
  }
};

export const createRollupProofData = (innerProofs: InnerProofData[]) => {
  const bridgeIds = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
  const defiDepositSums = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => BigInt(0));
  const defiInteractionNotes = [...Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK)].map(() => randomBytes(32));
  const assetIds = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => 0);
  const totalTxFees = [...Array(RollupProofData.NUMBER_OF_ASSETS)].map(() => BigInt(0));
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
    innerProofs.length,
    innerProofs,
  );
};
