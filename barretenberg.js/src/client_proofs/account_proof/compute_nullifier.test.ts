import { BarretenbergWasm } from '../../wasm';
import { Pedersen } from '../../crypto/pedersen';
import { computeAliasNullifier } from './compute_nullifier';
import { Blake2s } from '../../crypto/blake2s';

describe('account_proof_compute_nullifier', () => {
  let barretenberg!: BarretenbergWasm;
  let pedersen!: Pedersen;
  let blake2s!: Blake2s;

  beforeAll(async () => {
    barretenberg = await BarretenbergWasm.new();
    pedersen = new Pedersen(barretenberg);
    blake2s = new Blake2s(barretenberg);
  });

  it('should compute correct alias nullifier', async () => {
    const alias = 'pebble';
    const expected = Buffer.from('23a70515675b3e082ffb681f4c03dc2dbb1ab362c7edd88046bb95be6d34c10b', 'hex');
    const nullifier = computeAliasNullifier(alias, pedersen, blake2s);
    expect(nullifier).toEqual(expected);
  });
});
