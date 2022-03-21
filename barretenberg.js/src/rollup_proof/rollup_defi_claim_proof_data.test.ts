import { ProofId } from '../client_proofs/proof_data';
import { randomInnerProofData } from './fixtures';
import { RollupDefiClaimProofData } from './rollup_defi_claim_proof_data';
import { RollupDefiDepositProofData } from './rollup_defi_deposit_proof_data';

describe('RollupDefiClaimProofData', () => {
  it('throw if inner proof is not a defi claim proof', () => {
    const innerProofData = randomInnerProofData(ProofId.DEFI_DEPOSIT);
    expect(() => new RollupDefiClaimProofData(innerProofData)).toThrow();
  });

  it('encode and decode a proof', () => {
    const proof = new RollupDefiClaimProofData(randomInnerProofData(ProofId.DEFI_CLAIM));
    const encoded = proof.encode();
    expect(encoded.length).toBe(RollupDefiClaimProofData.ENCODED_LENGTH);
    expect(RollupDefiClaimProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new RollupDefiDepositProofData(randomInnerProofData(ProofId.DEFI_DEPOSIT));
    const encoded = proof.encode();
    expect(() => RollupDefiClaimProofData.decode(encoded)).toThrow();
  });
});
