import { randomBytes } from 'crypto';
import { ClientProofData, ProofId } from '../client_proofs';
import { randomInnerProofData } from './fixtures';
import { InnerProofData } from './inner_proof';

describe('InnerProofData', () => {
  it('can convert an inner proof object to buffer and back', () => {
    const innerProofData = randomInnerProofData();
    const buffer = innerProofData.toBuffer();
    expect(buffer.length).toBe(InnerProofData.LENGTH);

    const recovered = InnerProofData.fromBuffer(buffer);
    expect(recovered).toEqual(innerProofData);
  });

  it('should generate the same txId for all proof types', () => {
    [ProofId.JOIN_SPLIT, ProofId.ACCOUNT, ProofId.DEFI_CLAIM, ProofId.DEFI_CLAIM].forEach(proofId => {
      const innerProofData = randomInnerProofData(proofId);
      const rawClientProof = Buffer.concat([
        innerProofData.toBuffer(),
        randomBytes(32), // noteTreeRoot
        randomBytes(32), // txFee
      ]);
      const clientProofData = new ClientProofData(rawClientProof);
      expect(innerProofData.txId).toEqual(clientProofData.txId);
    });
  });
});
