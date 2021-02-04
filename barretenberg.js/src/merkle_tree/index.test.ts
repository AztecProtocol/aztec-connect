import { BarretenbergWasm } from '../wasm';
import { Pedersen } from '../crypto/pedersen';
import { MerkleTree, HashPath } from '.';
import levelup from 'levelup';
import memdown from 'memdown';

describe('merkle_tree', () => {
  let barretenberg!: BarretenbergWasm;
  let pedersen!: Pedersen;
  const values: Buffer[] = [];

  beforeAll(async () => {
    barretenberg = new BarretenbergWasm();
    await barretenberg.init();
    pedersen = new Pedersen(barretenberg);

    for (let i = 0; i < 32; ++i) {
      const v = Buffer.alloc(64, 0);
      v.writeUInt32LE(i, 0);
      values[i] = v;
    }
  });

  it('should have correct root', async () => {
    const db = levelup(memdown());

    const e00 = pedersen.hashToField(values[0]);
    const e01 = pedersen.hashToField(values[1]);
    const e02 = pedersen.hashToField(values[2]);
    const e03 = pedersen.hashToField(values[3]);
    const e10 = pedersen.compress(e00, e01);
    const e11 = pedersen.compress(e02, e03);
    const root = pedersen.compress(e10, e11);

    const tree = await MerkleTree.new(db, pedersen, 'test', 2);

    for (let i = 0; i < 4; ++i) {
      await tree.updateElement(i, values[i]);
    }

    let expected = new HashPath([
      [e00, e01],
      [e10, e11],
    ]);

    expect(await tree.getHashPath(0)).toEqual(expected);
    expect(await tree.getHashPath(1)).toEqual(expected);

    expected = new HashPath([
      [e02, e03],
      [e10, e11],
    ]);

    expect(await tree.getHashPath(2)).toEqual(expected);
    expect(await tree.getHashPath(3)).toEqual(expected);
    expect(tree.getRoot()).toEqual(root);
    expect(tree.getSize()).toBe(4);

    // Lifted from memory_store.test.cpp to ensure consistency.
    expect(root).toEqual(Buffer.from('28b8173e6d85156fbc33826f1905d42f524f5f77ad5f7433fa1091aa06b52441', 'hex'));
  });

  it('should have correct empty tree root for depth 10', async () => {
    const db = levelup(memdown());
    const tree = await MerkleTree.new(db, pedersen, 'test', 10);
    const root = tree.getRoot();
    expect(root).toEqual(Buffer.from('2d5a54bd09fb2f40e03689cbe46bcbc42a7b64632fa4ebb76d351c558a51be53', 'hex'));
  });

  it('should have same result when setting same values', async () => {
    const db = levelup(memdown());
    const tree = await MerkleTree.new(db, pedersen, 'test', 10);

    for (let i = 0; i < values.length; ++i) {
      await tree.updateElement(i, values[i]);
    }
    const root1 = tree.getRoot();

    for (let i = 0; i < values.length; ++i) {
      await tree.updateElement(i, values[i]);
    }
    const root2 = tree.getRoot();

    expect(root1).toEqual(root2);
  });

  it('should get same result when using subtree insertion', async () => {
    const db1 = levelup(memdown());
    const tree1 = await MerkleTree.new(db1, pedersen, 'test', 10);

    for (let i = 0; i < values.length; ++i) {
      await tree1.updateElement(i, values[i]);
    }

    const db2 = levelup(memdown());
    const tree2 = await MerkleTree.new(db2, pedersen, 'test', 10);

    const subtreeInsertIndex = values.length / 2;
    for (let i = 0; i < subtreeInsertIndex; ++i) {
      await tree2.updateElement(i, values[i]);
    }
    await tree2.updateElements(subtreeInsertIndex, values.slice(subtreeInsertIndex));

    expect(tree2.getRoot().toString('hex')).toEqual(tree2.getRoot().toString('hex'));

    for (let i = 0; i < values.length; ++i) {
      const hashPath1 = await tree1.getHashPath(i);
      const hashPath2 = await tree2.getHashPath(i);
      expect(hashPath2).toStrictEqual(hashPath1);
    }
  });

  /*
  it('benchmark', async () => {
    const values: Buffer[] = [];
    for (let i = 0; i < 64; ++i) {
      const v = Buffer.alloc(64, 0);
      v.writeUInt32LE(i, 0);
      values[i] = v;
    }

    const db = levelup(memdown());
    const tree = await MerkleTree.new(db, pedersen, 'test', 32);

    const start = new Date().getTime();
    await tree.updateElements(0, values);
    const end = new Date().getTime() - start;
    console.log(end);
  });
  */

  it('should be able to restore from previous data', async () => {
    const levelDown = memdown();
    const db = levelup(levelDown);
    const tree = await MerkleTree.new(db, pedersen, 'test', 10);
    for (let i = 0; i < 4; ++i) {
      await tree.updateElement(i, values[i]);
    }

    const db2 = levelup(levelDown);
    const tree2 = await MerkleTree.fromName(db2, pedersen, 'test');

    expect(tree.getRoot()).toEqual(tree2.getRoot());
    for (let i = 0; i < 4; ++i) {
      expect(await tree.getHashPath(i)).toEqual(await tree2.getHashPath(i));
    }
  });

  it('should throw an error if previous data does not exist for the given name', async () => {
    const db = levelup(memdown());
    await expect(
      (async () => {
        await MerkleTree.fromName(db, pedersen, 'a_whole_new_tree');
      })(),
    ).rejects.toThrow();
  });

  it('should be able to sync the latest status from db', async () => {
    const levelDown = memdown();

    const db1 = levelup(levelDown);
    const tree1 = await MerkleTree.new(db1, pedersen, 'test', 10);

    const db2 = levelup(levelDown);
    const tree2 = await MerkleTree.new(db2, pedersen, 'test', 10);

    expect(tree1.getRoot()).toEqual(tree2.getRoot());
    expect(tree1.getSize()).toBe(0);
    expect(tree2.getSize()).toBe(0);

    for (let i = 0; i < 4; ++i) {
      await tree1.updateElement(i, values[i]);
    }

    const newRoot = tree1.getRoot();
    expect(tree1.getSize()).toBe(4);
    expect(tree2.getRoot()).not.toEqual(newRoot);
    expect(tree2.getSize()).toBe(0);

    await tree2.syncFromDb();

    expect(tree2.getRoot()).toEqual(newRoot);
    expect(tree2.getSize()).toBe(4);
  });

  it('should serialize hash path data to a buffer and be able to deserialize it back', async () => {
    const db = levelup(memdown());
    const tree = await MerkleTree.new(db, pedersen, 'test', 10);
    tree.updateElement(0, values[0]);

    const hashPath = await tree.getHashPath(0);
    const buf = hashPath.toBuffer();
    const recovered = HashPath.fromBuffer(buf);
    expect(recovered).toEqual(hashPath);
    const deserialized = HashPath.deserialize(buf);
    expect(deserialized.elem).toEqual(hashPath);
    expect(deserialized.adv).toBe(4 + 10 * 64);

    const dummyData = Buffer.alloc(23, 1);
    const paddedBuf = Buffer.concat([dummyData, buf]);
    const recovered2 = HashPath.fromBuffer(paddedBuf, 23);
    expect(recovered2).toEqual(hashPath);
    const deserialized2 = HashPath.deserialize(buf);
    expect(deserialized2.elem).toEqual(hashPath);
    expect(deserialized2.adv).toBe(4 + 10 * 64);
  });
});
