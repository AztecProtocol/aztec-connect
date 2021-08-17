import { randomBytes } from 'crypto';
import { AccountAliasId } from '../account_id';
import { ProofId } from '../client_proofs/proof_data';
import { AccountProofData } from './account_proof_data';
import { DefiDepositProofData } from './defi_deposit_proof_data';
import { randomInnerProofData } from './fixtures';
import { InnerProofData } from './inner_proof';

describe('AccountProofData', () => {
  it('can get typed data from proof data', () => {
    const accountAliasId = AccountAliasId.random();
    const publicKey = randomBytes(64);
    const innerProofData = new InnerProofData(
      ProofId.ACCOUNT,
      publicKey.slice(0, 32),
      publicKey.slice(32),
      accountAliasId.toBuffer(),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
    );
    const accountProof = new AccountProofData(innerProofData);
    expect(accountProof.accountAliasId).toEqual(accountAliasId);
    expect(accountProof.publicKey).toEqual(publicKey);
  });

  it('throw if inner proof is not an account proof', () => {
    const innerProofData = randomInnerProofData(ProofId.JOIN_SPLIT);
    expect(() => new AccountProofData(innerProofData)).toThrow();
  });

  it('encode and decode a proof', () => {
    const proof = new AccountProofData(randomInnerProofData(ProofId.ACCOUNT));
    const encoded = proof.encode();
    expect(encoded.length).toBe(AccountProofData.ENCODED_LENGTH);
    expect(AccountProofData.decode(encoded)).toEqual(proof);
  });

  it('throw if try to decode the wrong type of proof', () => {
    const proof = new DefiDepositProofData(randomInnerProofData(ProofId.DEFI_DEPOSIT));
    const encoded = proof.encode();
    expect(() => AccountProofData.decode(encoded)).toThrow();
  });
});
