import { randomBytes } from '../crypto/index.js';
import { EthAddress } from '../address/index.js';
import { toBufferBE } from '../bigint_buffer/index.js';
import { ProofId } from '../client_proofs/index.js';
import { numToUInt32BE } from '../serialize/index.js';
import { randomDepositProofData, randomInnerProofData } from './fixtures.js';
import { InnerProofData } from './inner_proof.js';
import { RollupDefiDepositProofData } from './rollup_defi_deposit_proof_data.js';
import { RollupDepositProofData } from './rollup_deposit_proof_data.js';

describe('RollupDepositProofData', () => {
  it('can get typed data from proof data', () => {
    const assetId = 123;
    const publicValue = BigInt(123);
    const publicOwner = EthAddress.random();
    const innerProofData = new InnerProofData(
      ProofId.DEPOSIT,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      toBufferBE(publicValue, 32),
      publicOwner.toBuffer32(),
      numToUInt32BE(assetId, 32),
    );
    const jsProof = new RollupDepositProofData(innerProofData);
    expect(jsProof.assetId).toBe(assetId);
    expect(jsProof.publicValue).toBe(publicValue);
    expect(jsProof.publicOwner).toEqual(publicOwner);
  });

  it('throw if inner proof is not a deposit proof', () => {
    const innerProofData = randomInnerProofData(ProofId.DEFI_DEPOSIT);
    expect(() => new RollupDepositProofData(innerProofData)).toThrow();
  });

  it('encode and decode a proof', () => {
    const proof = new RollupDepositProofData(randomDepositProofData());
    const encoded = proof.encode();
    expect(encoded.length).toBe(RollupDepositProofData.ENCODED_LENGTH);
    expect(RollupDepositProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new RollupDefiDepositProofData(randomInnerProofData(ProofId.DEFI_DEPOSIT));
    const encoded = proof.encode();
    expect(() => RollupDepositProofData.decode(encoded)).toThrow();
  });
});
