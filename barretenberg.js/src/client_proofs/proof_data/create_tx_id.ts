import { createHash } from 'crypto';
import { ProofId } from './proof_id';

export const LENGTH_PROOF_HEADER_INPUTS = 12 * 32;

export const createTxId = (rawProofData: Buffer) => {
  const proofId = rawProofData.readUInt32BE(0 * 32 + 28);
  const txIdData =
    proofId === ProofId.DEFI_DEPOSIT
      ? Buffer.concat([
          rawProofData.slice(0, 4 * 32),
          Buffer.alloc(2 * 32), // Ignore claim note. We mix in interaction nonce in the rollup circuit, which creates a differrent new note.
          rawProofData.slice(6 * 32),
        ])
      : rawProofData;
  return createHash('sha256').update(txIdData.slice(0, LENGTH_PROOF_HEADER_INPUTS)).digest();
};
