import { BarretenbergWasm } from '../wasm';
import { Blake2s } from '../crypto/blake2s';
import { Pedersen } from '../crypto/pedersen';
import { MerkleTree } from '.';
import levelup from 'levelup';
import memdown from 'memdown';

describe('merkle_tree', () => {
  let barretenberg!: BarretenbergWasm;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;
  const values: Buffer[] = [];

  beforeAll(async () => {
    barretenberg = new BarretenbergWasm();
    await barretenberg.init();
    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);

    for (let i = 0; i < 4; ++i) {
      const v = Buffer.alloc(64, 0);
      v.writeUInt32LE(i, 0);
      values[i] = v;
    }
  });

  it('should have correct root', async () => {
    const db = levelup(memdown());

    const e00 = blake2s.hashToField(values[0]);
    const e01 = blake2s.hashToField(values[1]);
    const e02 = blake2s.hashToField(values[2]);
    const e03 = blake2s.hashToField(values[3]);
    const e10 = pedersen.compress(e00, e01);
    const e11 = pedersen.compress(e02, e03);
    const root = pedersen.compress(e10, e11);

    const tree = await MerkleTree.new(db, pedersen, blake2s, 'test', 2);

    for (let i = 0; i < 4; ++i) {
      await tree.updateElement(i, values[i]);
    }

    for (let i = 0; i < 4; ++i) {
      expect(await tree.getElement(i)).toEqual(values[i]);
    }

    let expected = [[e00, e01], [e10, e11]];

    expect(await tree.getHashPath(0)).toEqual(expected);
    expect(await tree.getHashPath(1)).toEqual(expected);

    expected = [[e02, e03], [e10, e11]];

    expect(await tree.getHashPath(2)).toEqual(expected);
    expect(await tree.getHashPath(3)).toEqual(expected);
    expect(tree.getRoot()).toEqual(root);
    expect(tree.getSize()).toBe(4);

    // Lifted from memory_store.test.cpp to ensure consistency.
    expect(root).toEqual(Buffer.from('2fa6d2259d22e6992f4824d80cd2ef803c54b83b885d611a6b37c138b119d08b', 'hex'));
  });

  it('should have correct empty tree root for depth 10', async () => {
    const db = levelup(memdown());
    const tree = await MerkleTree.new(db, pedersen, blake2s, 'test', 10);
    const root = tree.getRoot();
    expect(root).toEqual(Buffer.from('28703b88327e4d75dca124b208f36f39915714fe14cb9bb2f852afc1aa9244be', 'hex'));
  });

  it('should be able to restore from previous data', async () => {
    const levelDown = memdown();
    const db = levelup(levelDown);
    const tree = await MerkleTree.new(db, pedersen, blake2s, 'test', 10);
    for (let i = 0; i < 4; ++i) {
      await tree.updateElement(i, values[i]);
    }

    const db2 = levelup(levelDown);
    const tree2 = await MerkleTree.fromName(db2, pedersen, blake2s, 'test');

    expect(tree.getRoot()).toEqual(tree2.getRoot());
    for (let i = 0; i < 4; ++i) {
      expect(await tree.getHashPath(i)).toEqual(await tree2.getHashPath(i));
    }
  });

  it('should throw an error if previous data does not exist for the given name', async () => {
    const db = levelup(memdown());
    await expect(
      (async () => {
        await MerkleTree.fromName(db, pedersen, blake2s, 'a_whole_new_tree');
      })(),
    ).rejects.toThrow();
  });
});
