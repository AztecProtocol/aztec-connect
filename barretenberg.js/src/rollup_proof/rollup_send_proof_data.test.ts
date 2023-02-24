import { ProofId } from '../client_proofs/index.js';
import { randomInnerProofData, randomSendProofData } from './fixtures.js';
import { RollupSendProofData } from './rollup_send_proof_data.js';
import { RollupWithdrawProofData } from './rollup_withdraw_proof_data.js';

describe('RollupSendProofData', () => {
  it('throw if inner proof is not a send proof', () => {
    const innerProofData = randomInnerProofData(ProofId.DEPOSIT);
    expect(() => new RollupSendProofData(innerProofData)).toThrow();
  });

  it('encode and decode a proof', () => {
    const proof = new RollupSendProofData(randomSendProofData());
    const encoded = proof.encode();
    expect(encoded.length).toBe(RollupSendProofData.ENCODED_LENGTH);
    expect(RollupSendProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new RollupWithdrawProofData(randomInnerProofData(ProofId.WITHDRAW));
    const encoded = proof.encode();
    expect(() => RollupSendProofData.decode(encoded)).toThrow();
  });
});
