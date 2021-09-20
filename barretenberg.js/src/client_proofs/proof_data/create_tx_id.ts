import { Keccak } from 'sha3';
import { ProofId } from './proof_id';

const hash = new Keccak(256);

export function createTxId(rawProofData: Buffer) {
  const proofId = rawProofData.readUInt32BE(28);
  const txIdData =
    proofId === ProofId.DEFI_DEPOSIT
      ? Buffer.concat([
          rawProofData.slice(0, 32),
          Buffer.alloc(32), // Ignore claim note. We mix in interaction nonce in the rollup circuit, which creates a different new note.
          rawProofData.slice(2 * 32),
        ])
      : rawProofData;
  hash.reset();
  return hash.update(txIdData).digest();
}
