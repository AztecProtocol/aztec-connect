import { ProofId } from '../client_proofs/proof_data';
import { randomInnerProofData } from './fixtures';
import { RollupAccountProofData } from './rollup_account_proof_data';
import { RollupDefiDepositProofData } from './rollup_defi_deposit_proof_data';

describe('RollupAccountProofData', () => {
  it('throw if inner proof is not an account proof', () => {
    const innerProofData = randomInnerProofData(ProofId.DEPOSIT);
    expect(() => new RollupAccountProofData(innerProofData)).toThrow();
  });

  it('encode and decode a proof', () => {
    const proof = new RollupAccountProofData(randomInnerProofData(ProofId.ACCOUNT));
    const encoded = proof.encode();
    expect(encoded.length).toBe(RollupAccountProofData.ENCODED_LENGTH);
    expect(RollupAccountProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new RollupDefiDepositProofData(randomInnerProofData(ProofId.DEFI_DEPOSIT));
    const encoded = proof.encode();
    expect(() => RollupAccountProofData.decode(encoded)).toThrow();
  });
});
