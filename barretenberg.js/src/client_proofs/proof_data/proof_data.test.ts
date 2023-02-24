import { ProofData } from './proof_data.js';
import { randomInnerProofData } from '../../rollup_proof/fixtures.js';
import { ProofId } from './proof_id.js';
import { InnerProofData } from '../../rollup_proof/inner_proof.js';
import { randomBytes } from 'crypto';
import { createTxId } from './create_tx_id.js';

describe('proof data', () => {
  it('should build Proof Data quickly', () => {
    const rawClientProofs = Array.from({ length: 1000 }, () => 0).map(() => {
      return Buffer.concat([
        randomInnerProofData(ProofId.DEPOSIT).toBuffer(),
        randomBytes(32 * (ProofData.NUM_PUBLIC_INPUTS - InnerProofData.NUM_PUBLIC_INPUTS)),
      ]);
    });
    rawClientProofs.map(x => new ProofData(x));
  });
  it('should produce the correct tx id', () => {
    const rawClientProof = Buffer.concat([
      randomInnerProofData(ProofId.DEPOSIT).toBuffer(),
      randomBytes(32 * (ProofData.NUM_PUBLIC_INPUTS - InnerProofData.NUM_PUBLIC_INPUTS)),
    ]);
    const expectedTxId = createTxId(rawClientProof.slice(0, ProofData.NUM_PUBLISHED_PUBLIC_INPUTS * 32));
    const proofData = new ProofData(rawClientProof);
    expect(proofData.txId).toEqual(expectedTxId);
  });
});
