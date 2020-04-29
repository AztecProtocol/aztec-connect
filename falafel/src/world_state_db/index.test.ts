import { WorldStateDb } from "./index";
import { randomBytes } from "crypto";

describe("world_state_db", () => {
  let worldStateDb: WorldStateDb;

  beforeEach(() => {
    worldStateDb = new WorldStateDb();
    worldStateDb.destroy();
    worldStateDb.start();
  });

  afterEach(() => {
    worldStateDb.stop();
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
