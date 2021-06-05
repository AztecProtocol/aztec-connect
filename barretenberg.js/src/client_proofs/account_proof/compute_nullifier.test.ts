import { BarretenbergWasm } from '../../wasm';
import { Pedersen } from '../../crypto/pedersen';
import { computeAccountAliasIdNullifier } from './compute_nullifier';
import { Blake2s } from '../../crypto/blake2s';
import { AccountAliasId } from '../account_alias_id';

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
    const nonce = 1;
    const accountAliasId = AccountAliasId.fromAlias('pebble', nonce, blake2s);
    const nullifier = computeAccountAliasIdNullifier(accountAliasId, pedersen);

    const expected = '2be15bf88b9f26dd3502a8647949f5d197afbe7cd772917e7b0d21c16cba0a14';

    expect(nullifier.toString('hex')).toEqual(expected);
  });
});
