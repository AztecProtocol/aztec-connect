import { BarretenbergWasm } from '../../wasm';
import { Pedersen } from '../../crypto/pedersen';
import { computeAccountAliasIdNullifier } from './compute_nullifier';
import { Blake2s } from '../../crypto/blake2s';
import { AccountAliasId } from '../account_alias_id';
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
    const accountAliasId = new AccountAliasId(aliasHash, nonce);
    const nullifier = computeAccountAliasIdNullifier(accountAliasId, pedersen);

    const expected = Buffer.from('07b0af8337b106f504265f5f633a2980bb22e292ac05f51d5c569b2474bf1f7e', 'hex');

    expect(nullifier).toEqual(expected);
  });
});
