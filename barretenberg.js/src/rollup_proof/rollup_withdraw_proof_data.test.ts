import { randomBytes } from '../crypto/index.js';
import { EthAddress } from '../address/index.js';
import { toBufferBE } from '../bigint_buffer/index.js';
import { ProofId } from '../client_proofs/index.js';
import { numToUInt32BE } from '../serialize/index.js';
import { randomInnerProofData, randomWithdrawProofData } from './fixtures.js';
import { InnerProofData } from './inner_proof.js';
import { RollupSendProofData } from './rollup_send_proof_data.js';
import { RollupWithdrawProofData } from './rollup_withdraw_proof_data.js';

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
