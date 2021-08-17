import { randomBytes } from 'crypto';
import { toBufferBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';
import { ProofId } from '../client_proofs/proof_data';
import { DefiDepositProofData } from './defi_deposit_proof_data';
import { randomInnerProofData } from './fixtures';
import { InnerProofData } from './inner_proof';
import { JoinSplitProofData } from './join_split_proof_data';

describe('DefiDepositProofData', () => {
  it('can get typed data from proof data', () => {
    const bridgeId = BridgeId.random();
    const depositValue = BigInt(123);
    const partialState = randomBytes(32);
    const innerProofData = new InnerProofData(
      ProofId.DEFI_DEPOSIT,
      Buffer.alloc(32),
      toBufferBE(depositValue, 32),
      bridgeId.toBuffer(),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      partialState,
      Buffer.alloc(32),
    );
    const defiDepositProof = new DefiDepositProofData(innerProofData);
    expect(defiDepositProof.bridgeId).toEqual(bridgeId);
    expect(defiDepositProof.depositValue).toEqual(depositValue);
    expect(defiDepositProof.partialState).toEqual(partialState);
  });

  it('throw if inner proof is not a defi deposit proof', () => {
    const innerProofData = randomInnerProofData(ProofId.JOIN_SPLIT);
    expect(() => new DefiDepositProofData(innerProofData)).toThrow();
  });

  it('encode and decode a proof', () => {
    const proof = new DefiDepositProofData(randomInnerProofData(ProofId.DEFI_DEPOSIT));
    const encoded = proof.encode();
    expect(encoded.length).toBe(DefiDepositProofData.ENCODED_LENGTH);
    expect(DefiDepositProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new JoinSplitProofData(randomInnerProofData(ProofId.JOIN_SPLIT));
    const encoded = proof.encode();
    expect(() => DefiDepositProofData.decode(encoded)).toThrow();
  });
});
