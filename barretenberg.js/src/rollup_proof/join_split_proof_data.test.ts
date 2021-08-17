import { randomBytes } from 'crypto';
import { EthAddress } from '../address';
import { toBufferBE } from '../bigint_buffer';
import { ProofId } from '../client_proofs/proof_data';
import { numToUInt32BE } from '../serialize';
import { DefiDepositProofData } from './defi_deposit_proof_data';
import { randomDepositProofData, randomInnerProofData, randomSendProofData, randomWithdrawProofData } from './fixtures';
import { InnerProofData } from './inner_proof';
import { JoinSplitProofData } from './join_split_proof_data';
import { TxEncoding } from './tx_encoding';

describe('JoinSplitProofData', () => {
  it('can get typed data from proof data', () => {
    const publicInput = BigInt(123);
    const publicOutput = BigInt(123);
    const assetId = 123;
    const inputOwner = EthAddress.randomAddress();
    const outputOwner = EthAddress.randomAddress();
    const innerProofData = new InnerProofData(
      ProofId.JOIN_SPLIT,
      toBufferBE(publicInput, 23),
      toBufferBE(publicOutput, 23),
      numToUInt32BE(assetId, 32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      inputOwner.toBuffer32(),
      outputOwner.toBuffer32(),
    );
    const jsProof = new JoinSplitProofData(innerProofData);
    expect(jsProof.publicInput).toBe(publicInput);
    expect(jsProof.publicOutput).toBe(publicOutput);
    expect(jsProof.assetId).toBe(assetId);
    expect(jsProof.inputOwner).toEqual(inputOwner);
    expect(jsProof.outputOwner).toEqual(outputOwner);
  });

  it('throw if inner proof is not a join split proof', () => {
    const innerProofData = randomInnerProofData(ProofId.DEFI_DEPOSIT);
    expect(() => new JoinSplitProofData(innerProofData)).toThrow();
  });

  it('encode and decode a deposit proof', () => {
    const proof = new JoinSplitProofData(randomDepositProofData());
    const encoded = proof.encode();
    expect(encoded.length).toBe(JoinSplitProofData.ENCODED_LENGTH(TxEncoding.DEPOSIT));
    expect(JoinSplitProofData.decode(encoded)).toEqual(proof);
  });

  it('encode and decode a send proof', () => {
    const proof = new JoinSplitProofData(randomSendProofData());
    const encoded = proof.encode();
    expect(encoded.length).toBe(JoinSplitProofData.ENCODED_LENGTH(TxEncoding.SEND));
    expect(JoinSplitProofData.decode(encoded)).toEqual(proof);
  });

  it('encode and decode a withdraw proof', () => {
    const proof = new JoinSplitProofData(randomWithdrawProofData());
    const encoded = proof.encode();
    expect(encoded.length).toBe(JoinSplitProofData.ENCODED_LENGTH(TxEncoding.WITHDRAW));
    expect(JoinSplitProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new DefiDepositProofData(randomInnerProofData(ProofId.DEFI_DEPOSIT));
    const encoded = proof.encode();
    expect(() => JoinSplitProofData.decode(encoded)).toThrow();
  });
});
