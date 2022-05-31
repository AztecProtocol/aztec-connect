import { randomBytes } from 'crypto';
import { EthAddress } from '../address';
import { toBufferBE } from '../bigint_buffer';
import { ProofId } from '../client_proofs/proof_data';
import { numToUInt32BE } from '../serialize';
import { randomInnerProofData, randomWithdrawProofData } from './fixtures';
import { InnerProofData } from './inner_proof';
import { RollupSendProofData } from './rollup_send_proof_data';
import { RollupWithdrawProofData } from './rollup_withdraw_proof_data';

describe('RollupWithdrawProofData', () => {
  it('can get typed data from proof data', () => {
    const assetId = 123;
    const publicValue = BigInt(123);
    const publicOwner = EthAddress.random();
    const innerProofData = new InnerProofData(
      ProofId.WITHDRAW,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      toBufferBE(publicValue, 32),
      publicOwner.toBuffer32(),
      numToUInt32BE(assetId, 32),
    );
    const jsProof = new RollupWithdrawProofData(innerProofData);
    expect(jsProof.assetId).toBe(assetId);
    expect(jsProof.publicValue).toBe(publicValue);
    expect(jsProof.publicOwner).toEqual(publicOwner);
  });

  it('throw if inner proof is not a withdraw proof', () => {
    const innerProofData = randomInnerProofData(ProofId.DEPOSIT);
    expect(() => new RollupWithdrawProofData(innerProofData)).toThrow();
  });

  it('encode and decode a proof', () => {
    const proof = new RollupWithdrawProofData(randomWithdrawProofData());
    const encoded = proof.encode();
    expect(encoded.length).toBe(RollupWithdrawProofData.ENCODED_LENGTH);
    expect(RollupWithdrawProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new RollupSendProofData(randomInnerProofData(ProofId.SEND));
    const encoded = proof.encode();
    expect(() => RollupWithdrawProofData.decode(encoded)).toThrow();
  });
});
