import { Keccak } from 'sha3';
import { ProofId } from './proof_id';

const hash = new Keccak(256);

export function createTxId(rawProofData: Buffer) {
  const proofId = rawProofData.readUInt32BE(28);
  const txIdData =
    proofId === ProofId.DEFI_DEPOSIT
      ? Buffer.concat([
          rawProofData.slice(0, 32),
          Buffer.alloc(32), // Ignore the partial claim note commitment (commitment 1). We mix in an interaction nonce in the rollup circuit, to create a completed claim note commitment. So if we were to include the partial commitment in the txId, we wouldn't be able to reconstruct it when responding to the emitted event, which will contain a different (completed) claim note commitment.
          rawProofData.slice(2 * 32),
        ])
      : rawProofData;
  hash.reset();
  return hash.update(txIdData).digest();
}
