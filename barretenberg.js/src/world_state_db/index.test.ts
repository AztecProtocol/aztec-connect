import { randomBytes } from 'crypto';
import { WorldStateDb } from './index';

describe('world_state_db', () => {
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

  it('should be initialized with correct metadata', async () => {
    const expectedDataRoot = Buffer.from('2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39', 'hex');
    const expectedNullRoot = Buffer.from('2694dbe3c71a25d92213422d392479e7b8ef437add81e1e17244462e6edca9b1', 'hex');
    const expectedRootRoot = Buffer.from('2d264e93dc455751a721aead9dba9ee2a9fef5460921aeede73f63f6210e6851', 'hex');

    expect(worldStateDb.getRoot(0)).toEqual(expectedDataRoot);
    expect(worldStateDb.getRoot(1)).toEqual(expectedNullRoot);
    expect(worldStateDb.getRoot(2)).toEqual(expectedRootRoot);
    expect(worldStateDb.getSize(0)).toBe(BigInt(0));
    expect(worldStateDb.getSize(1)).toBe(BigInt(0));
    expect(worldStateDb.getSize(2)).toBe(BigInt(1));
  });

  it('should get correct value', async () => {
    const buffer = await worldStateDb.get(0, BigInt(0));
    expect(buffer).toEqual(Buffer.alloc(64, 0));
  });

  it('should get correct hash path', async () => {
    const path = (await worldStateDb.getHashPath(0, BigInt(0))).data;

    const expectedFirst = Buffer.from('0000000000000000000000000000000000000000000000000000000000000040', 'hex');
    const expectedLast = Buffer.from('0a4feb3207e1113f42f22232e53b13da0624a46b3779338e7f2ed9dfde4a5ba8', 'hex');

    expect(path.length).toEqual(32);
    expect(path[0][0]).toEqual(expectedFirst);
    expect(path[0][1]).toEqual(expectedFirst);
    expect(path[31][0]).toEqual(expectedLast);
    expect(path[31][1]).toEqual(expectedLast);

    const nullPath = (await worldStateDb.getHashPath(1, BigInt(0))).data;
    expect(nullPath.length).toEqual(256);
  });

  it('should update value', async () => {
    const value = Buffer.alloc(64, 5);
    const root = await worldStateDb.put(0, BigInt(0), value);

    const result = await worldStateDb.get(0, BigInt(0));
    expect(result).toEqual(value);

    // prettier-ignore
    expect(root).toEqual(Buffer.from('0b8df4d2715e0cca64c24d704b58de179ac2c3ca8162f5e78f59c1443d922bc5', 'hex'));

    expect(worldStateDb.getRoot(0)).toEqual(root);
    expect(worldStateDb.getSize(0)).toEqual(BigInt(1));
  });

  it('should update multiple values', async () => {
    const num = 1024;
    const values = new Array(num).fill(0).map(() => randomBytes(64));
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
    const value1 = Buffer.alloc(64, 5);
    const value2 = Buffer.alloc(64, 6);
    await worldStateDb.put(0, BigInt(10), value1);
    await worldStateDb.put(1, BigInt(10), value2);

    const result1 = await worldStateDb.get(0, BigInt(10));
    const result2 = await worldStateDb.get(1, BigInt(10));

    expect(result1).toEqual(value1);
    expect(result2).toEqual(value2);
  });

  it('should be able to rollback to the previous commit', async () => {
    const values = new Array(3).fill(0).map(() => randomBytes(64));

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
    const values = new Array(num).fill(0).map(() => randomBytes(64));
    await Promise.all(
      values.map(async (value, i) => {
        await worldStateDb.put(0, BigInt(i), value);
      }),
    );

    const buffers = await Promise.all(values.map(async (_, i) => worldStateDb.get(0, BigInt(i))));
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
