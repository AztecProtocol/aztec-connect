import { ProofId } from '../client_proofs/proof_data';
import { randomInnerProofData } from './fixtures';
import { RollupDefiClaimProofData } from './rollup_defi_claim_proof_data';
import { RollupDefiDepositProofData } from './rollup_defi_deposit_proof_data';

describe('RollupDefiDepositProofData', () => {
  it('throw if inner proof is not a defi deposit proof', () => {
    const innerProofData = randomInnerProofData(ProofId.ACCOUNT);
    expect(() => new RollupDefiDepositProofData(innerProofData)).toThrow();
  });

  it('encode and decode a proof', () => {
    const proof = new RollupDefiDepositProofData(randomInnerProofData(ProofId.DEFI_DEPOSIT));
    const encoded = proof.encode();
    expect(encoded.length).toBe(RollupDefiDepositProofData.ENCODED_LENGTH);
    expect(RollupDefiDepositProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new RollupDefiClaimProofData(randomInnerProofData(ProofId.DEFI_CLAIM));
    const encoded = proof.encode();
    expect(() => RollupDefiDepositProofData.decode(encoded)).toThrow();
  });
});
