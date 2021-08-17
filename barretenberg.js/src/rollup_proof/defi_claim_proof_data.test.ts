import { randomBytes } from 'crypto';
import { BridgeId } from '../bridge_id';
import { ProofId } from '../client_proofs/proof_data';
import { DefiClaimProofData } from './defi_claim_proof_data';
import { DefiDepositProofData } from './defi_deposit_proof_data';
import { randomInnerProofData } from './fixtures';
import { InnerProofData } from './inner_proof';

describe('DefiClaimProofData', () => {
  it('can get typed data from proof data', () => {
    const bridgeId = BridgeId.random();
    const innerProofData = new InnerProofData(
      ProofId.DEFI_CLAIM,
      Buffer.alloc(32),
      Buffer.alloc(32),
      bridgeId.toBuffer(),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
    );
    const defiClaimProof = new DefiClaimProofData(innerProofData);
    expect(defiClaimProof.bridgeId).toEqual(bridgeId);
  });

  it('throw if inner proof is not a defi claim proof', () => {
    const innerProofData = randomInnerProofData(ProofId.DEFI_DEPOSIT);
    expect(() => new DefiClaimProofData(innerProofData)).toThrow();
  });

  it('encode and decode a proof', () => {
    const proof = new DefiClaimProofData(randomInnerProofData(ProofId.DEFI_CLAIM));
    const encoded = proof.encode();
    expect(encoded.length).toBe(DefiClaimProofData.ENCODED_LENGTH);
    expect(DefiClaimProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new DefiDepositProofData(randomInnerProofData(ProofId.DEFI_DEPOSIT));
    const encoded = proof.encode();
    expect(() => DefiClaimProofData.decode(encoded)).toThrow();
  });
});
