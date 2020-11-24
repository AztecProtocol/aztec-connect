import { BarretenbergWasm } from '../../wasm';
import { Pedersen } from '../../crypto/pedersen';
import { computeAccountIdNullifier } from './compute_nullifier';
import { Blake2s } from '../../crypto/blake2s';
import { AccountId } from '../account_id';
import { AliasHash } from '../alias_hash';

describe('account_proof_compute_nullifier', () => {
  let barretenberg!: BarretenbergWasm;
  let pedersen!: Pedersen;
  let blake2s!: Blake2s;

  beforeAll(async () => {
    barretenberg = await BarretenbergWasm.new();
    pedersen = new Pedersen(barretenberg);
    blake2s = new Blake2s(barretenberg);
  });

  it('should compute correct alias id nullifier', async () => {
    const aliasHash = AliasHash.fromAlias('pebble', blake2s);
    const nonce = 1;
    const accountId = new AccountId(aliasHash, nonce);
    const nullifier = computeAccountIdNullifier(accountId, pedersen);

    const expected = Buffer.from('07b0af8337b106f504265f5f633a2980bb22e292ac05f51d5c569b2474bf1f7e', 'hex');

    expect(nullifier).toEqual(expected);
  });
});
