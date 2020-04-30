import { WorldStateDb } from "./index";
import { randomBytes } from "crypto";

describe("world_state_db", () => {
  let worldStateDb: WorldStateDb;

  beforeEach(async () => {
    worldStateDb = new WorldStateDb();
    worldStateDb.destroy();
    await worldStateDb.start();
  });

  afterEach(() => {
    worldStateDb.stop();
  });

  it("should be initialized with correct metadata", async () => {
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

    expect(worldStateDb.getRoot(0)).toEqual(expectedDataRoot);
    expect(worldStateDb.getRoot(1)).toEqual(expectedNullifierRoot);
    expect(worldStateDb.getSize(0)).toEqual(0n);
    expect(worldStateDb.getSize(1)).toEqual(0n);
  });

  it("should get correct value", async () => {
    const buffer = await worldStateDb.get(0, 0n);
    expect(buffer).toEqual(Buffer.alloc(64, 0));
  });

  it("should update value", async () => {
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

  it("should update multiple values", async () => {
    const num = 1024;
    const values = new Array(num).fill(0).map((_) => randomBytes(64));
    for (let i = 0; i < num; ++i) {
      await worldStateDb.put(0, BigInt(i), values[i]);
    }

    for (let i = 0; i < num; ++i) {
      const result = await worldStateDb.get(0, BigInt(i));
      expect(result).toEqual(values[i]);
    }

    expect(worldStateDb.getSize(0)).toEqual(BigInt(num));
  }, 60000);

  it("should update same value in both trees", async () => {
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
