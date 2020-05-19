import { randomBytes } from 'crypto';
import { WorldStateDb } from './index';

describe('world_state_db', () => {
  let worldStateDb: WorldStateDb;

  beforeEach(async () => {
    worldStateDb = new WorldStateDb();
    worldStateDb.destroy();
    await worldStateDb.start();
  });

  afterEach(() => {
    worldStateDb.stop();
  });

  it('should be initialized with correct metadata', async () => {
    // prettier-ignore
    const expectedDataRoot = Buffer.from([
      0x1d, 0xf6, 0xbd, 0xe5, 0x05, 0x16, 0xdd, 0x12, 0x01, 0x08, 0x8f, 0xd8, 0xdd, 0xa8, 0x4c, 0x97,
      0xed, 0xa5, 0x65, 0x24, 0x28, 0xd1, 0xc7, 0xe8, 0x6a, 0xf5, 0x29, 0xcc, 0x5e, 0x0e, 0xb8, 0x21,
    ]);

    // prettier-ignore
    const expectedNullifierRoot = Buffer.from([
      0x15, 0x21, 0x75, 0xcf, 0xfc, 0xb2, 0x3d, 0xfb, 0xd8, 0x02, 0x62, 0x80, 0x2e, 0x32, 0xef, 0xe7,
      0xdb, 0x5f, 0xdc, 0xb9, 0x1b, 0xa0, 0xa0, 0x52, 0x7a, 0xb1, 0xff, 0xb3, 0x23, 0xbf, 0x3f, 0xc0,
    ]);

    // prettier-ignore
    const expectedRootRoot = Buffer.from([
      0x2f, 0x9a, 0xa0, 0x9f, 0x1d, 0x85, 0xbd, 0x5e, 0x19, 0xe4, 0x9a, 0x37, 0xeb, 0x80, 0xc0, 0x30,
      0xcc, 0x4c, 0xa3, 0xa9, 0x41, 0x3a, 0xc9, 0xfa, 0xd3, 0x5c, 0x3e, 0x11, 0xa1, 0x11, 0x34, 0x61,
    ]);

    expect(worldStateDb.getRoot(0)).toEqual(expectedDataRoot);
    expect(worldStateDb.getRoot(1)).toEqual(expectedNullifierRoot);
    expect(worldStateDb.getRoot(2)).toEqual(expectedRootRoot);
    expect(worldStateDb.getSize(0)).toBe(0n);
    expect(worldStateDb.getSize(1)).toBe(0n);
    expect(worldStateDb.getSize(2)).toBe(315885815370900137696573865922285975586n);
  });

  it('should get correct value', async () => {
    const buffer = await worldStateDb.get(0, 0n);
    expect(buffer).toEqual(Buffer.alloc(64, 0));
  });

  it('should get correct hash path', async () => {
    const path = (await worldStateDb.getHashPath(0, 0n)).data;

    const expectedFirst = Buffer.from('1cdcf02431ba623767fe389337d011df1048dcc24b98ed81cec97627bab454a0', 'hex');
    const expectedLast = Buffer.from('10ae15eed66d2b5fa24239d72aa47d1bfd7f37eb0a1a55baf69e363c4808fc14', 'hex');

    expect(path.length).toEqual(32);
    expect(path[0][0]).toEqual(expectedFirst);
    expect(path[0][1]).toEqual(expectedFirst);
    expect(path[31][0]).toEqual(expectedLast);
    expect(path[31][1]).toEqual(expectedLast);

    const nullPath = (await worldStateDb.getHashPath(1, 0n)).data;
    expect(nullPath.length).toEqual(128);
  });

  it('should update value', async () => {
    const value = Buffer.alloc(64, 5);
    const root = await worldStateDb.put(0, 0n, value);

    const result = await worldStateDb.get(0, 0n);
    expect(result).toEqual(value);

    // prettier-ignore
    expect(root).toEqual(Buffer.from([
      0x27, 0xdf, 0xb6, 0xc9, 0x95, 0x54, 0x24, 0xd3, 0x45, 0x7b, 0x19, 0x5d, 0x62, 0xc5, 0x3c, 0xdd,
      0x20, 0xe9, 0x27, 0xb5, 0x07, 0xa6, 0xbf, 0xc3, 0x47, 0x2c, 0xe5, 0xd8, 0xc3, 0x7c, 0x2c, 0x25
    ]));

    expect(worldStateDb.getRoot(0)).toEqual(root);
    expect(worldStateDb.getSize(0)).toEqual(1n);
  });

  it('should update multiple values', async () => {
    const num = 1024;
    const values = new Array(num).fill(0).map(_ => randomBytes(64));
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
    await worldStateDb.put(0, 10n, value1);
    await worldStateDb.put(1, 10n, value2);

    const result1 = await worldStateDb.get(0, 10n);
    const result2 = await worldStateDb.get(1, 10n);

    expect(result1).toEqual(value1);
    expect(result2).toEqual(value2);
  });
});
