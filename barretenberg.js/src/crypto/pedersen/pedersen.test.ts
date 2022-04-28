import { BarretenbergWasm, WorkerPool } from '../../wasm';
import { PooledPedersen } from './pooled_pedersen';
import { SinglePedersen } from './single_pedersen';

describe('pedersen', () => {
  let barretenberg!: BarretenbergWasm;
  const values: Buffer[] = [];

  beforeAll(async () => {
    barretenberg = new BarretenbergWasm();
    await barretenberg.init();

    for (let i = 0; i < 2 ** 12; ++i) {
      const v = Buffer.alloc(32, 0);
      v.writeUInt32LE(i, 0);
      values[i] = v;
    }
  });

  it('hasher_consistency_and_benchmark', async () => {
    const singlePedersen = new SinglePedersen(barretenberg);
    await singlePedersen.init();
    const start1 = new Date().getTime();
    const singleResults = await singlePedersen.hashToTree(values);
    const end1 = new Date().getTime() - start1;

    const pool = await WorkerPool.new(barretenberg, 4);
    const pedersen = new PooledPedersen(barretenberg, pool);
    await pedersen.init();
    const start2 = new Date().getTime();
    const poolResults = await pedersen.hashToTree(values);
    const end2 = new Date().getTime() - start2;

    console.log(`Single hasher: ~${end1 / values.length}ms / value`);
    console.log(`Pooled hasher: ~${end2 / values.length}ms / value`);
    console.log(`Pooled improvement: ${(end1 / end2).toFixed(2)}x`);

    expect(poolResults).toEqual(singleResults);

    await pool.destroy();
  });
});
