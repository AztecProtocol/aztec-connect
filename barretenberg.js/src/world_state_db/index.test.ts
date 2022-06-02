import { randomBytes } from 'crypto';
import { WorldStateDb } from './index';
import { WorldStateConstants } from '../world_state';
import { MerkleTree } from '../merkle_tree';

const randomFr = () => {
  const bytes = randomBytes(32);
  bytes.writeUInt32BE(0);
  return bytes;
};

describe.skip('world_state_db', () => {
  let worldStateDb: WorldStateDb;

  beforeEach(async () => {
    worldStateDb = new WorldStateDb(`/tmp/world_state_db_${randomBytes(32).toString('hex')}.db`);
    worldStateDb.destroy();
    await worldStateDb.start();
  });

  afterEach(() => {
    worldStateDb.stop();
    worldStateDb.destroy();
  });

  it('should be initialized with correct metadata', () => {
    expect(worldStateDb.getRoot(0)).toEqual(WorldStateConstants.EMPTY_DATA_ROOT);
    expect(worldStateDb.getRoot(1)).toEqual(WorldStateConstants.EMPTY_NULL_ROOT);
    expect(worldStateDb.getRoot(2)).toEqual(WorldStateConstants.EMPTY_ROOT_ROOT);
    expect(worldStateDb.getRoot(3)).toEqual(WorldStateConstants.EMPTY_DEFI_ROOT);
    expect(worldStateDb.getSize(0)).toBe(BigInt(0));
    expect(worldStateDb.getSize(1)).toBe(BigInt(0));
    expect(worldStateDb.getSize(2)).toBe(BigInt(1));
    expect(worldStateDb.getSize(3)).toBe(BigInt(0));
  });

  it('should get correct value', async () => {
    const buffer = await worldStateDb.get(0, BigInt(0));
    expect(buffer).toEqual(Buffer.alloc(32, 0));
  });

  it('should get correct hash path', async () => {
    const path = (await worldStateDb.getHashPath(0, BigInt(0))).data;

    const expectedFirst = MerkleTree.ZERO_ELEMENT;
    const expectedLast = '02a12922daa0fe8d05620d98096220a86d9ebf4d9552dc0fbd3862b9c48f7ab9';

    expect(path.length).toEqual(32);
    expect(path[0][0]).toEqual(expectedFirst);
    expect(path[0][1]).toEqual(expectedFirst);
    expect(path[31][0].toString('hex')).toEqual(expectedLast);
    expect(path[31][1].toString('hex')).toEqual(expectedLast);

    const nullPath = (await worldStateDb.getHashPath(1, BigInt(0))).data;
    expect(nullPath.length).toEqual(256);
  });

  it('should update value', async () => {
    const value = Buffer.alloc(32, 0);
    value.writeUInt32BE(5, 28);
    const root = await worldStateDb.put(0, BigInt(0), value);

    const result = await worldStateDb.get(0, BigInt(0));
    expect(result).toEqual(value);
    expect(worldStateDb.getRoot(0)).toEqual(root);
    expect(worldStateDb.getSize(0)).toEqual(BigInt(1));
  });

  it('should update multiple values', async () => {
    const num = 1024;
    const values = new Array(num).fill(0).map(randomFr);
    for (let i = 0; i < num; ++i) {
      await worldStateDb.put(0, BigInt(i), values[i]);
    }

    for (let i = 0; i < num; ++i) {
      const result = await worldStateDb.get(0, BigInt(i));
      expect(result).toEqual(values[i]);
    }

    expect(worldStateDb.getSize(0)).toEqual(BigInt(num));
  }, 60000);

  it('should update same value in both trees', async () => {
    const value1 = randomFr();
    const value2 = randomFr();
    await worldStateDb.put(0, BigInt(10), value1);
    await worldStateDb.put(1, BigInt(10), value2);

    const result1 = await worldStateDb.get(0, BigInt(10));
    const result2 = await worldStateDb.get(1, BigInt(10));

    expect(result1).toEqual(value1);
    expect(result2).toEqual(value2);
  });

  it('should be able to rollback to the previous commit', async () => {
    const values = new Array(3).fill(0).map(randomFr);

    const rootEmpty = worldStateDb.getRoot(0);
    await worldStateDb.put(0, BigInt(0), values[0]);
    expect(worldStateDb.getRoot(0)).not.toEqual(rootEmpty);

    await worldStateDb.rollback();
    expect(worldStateDb.getRoot(0)).toEqual(rootEmpty);

    await worldStateDb.put(0, BigInt(0), values[0]);
    await worldStateDb.put(0, BigInt(1), values[1]);
    await worldStateDb.commit();
    const root2 = worldStateDb.getRoot(0);
    await worldStateDb.put(0, BigInt(2), values[2]);
    expect(worldStateDb.getRoot(0)).not.toEqual(root2);

    await worldStateDb.rollback();
    expect(worldStateDb.getRoot(0)).toEqual(root2);
  });

  it('should read and write standard I/O sequentially', async () => {
    const num = 10;
    const values = new Array(num).fill(0).map(randomFr);
    await Promise.all(
      values.map(async (value, i) => {
        await worldStateDb.put(0, BigInt(i), value);
      }),
    );

    const buffers = await Promise.all(values.map((_, i) => worldStateDb.get(0, BigInt(i))));
    for (let i = 0; i < num; ++i) {
      expect(buffers[i]).toEqual(values[i]);
    }

    const hashPaths = await Promise.all(values.map((_, i) => worldStateDb.getHashPath(0, BigInt(i))));
    for (let i = 0; i < num; ++i) {
      const hashPath = await worldStateDb.getHashPath(0, BigInt(i));
      expect(hashPaths[i]).toEqual(hashPath);
    }
  });
});
