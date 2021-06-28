import { AccountAliasId } from '../../account_id';
import { Blake2s } from '../../crypto/blake2s';
import { Pedersen } from '../../crypto/pedersen';
import { BarretenbergWasm } from '../../wasm';
import { computeAccountAliasIdNullifier } from './compute_nullifier';

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
    expect(nullifier.toString('hex')).toEqual('23f20f5a15b822bb8316f4d8d8aac49708b83b0ec99b14cbea3530de6a2379f3');
  });
});
