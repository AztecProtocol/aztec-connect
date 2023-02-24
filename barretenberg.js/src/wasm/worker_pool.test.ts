import { WorkerPool } from './worker_pool.js';
import { BarretenbergWasm } from './barretenberg_wasm.js';

describe('wasm worker pool', () => {
  it('should call worker', async () => {
    const pool = await WorkerPool.new(await BarretenbergWasm.new(), 4);
    try {
      const memSizeWasm0 = await pool.workers[0].memSize();
      expect(memSizeWasm0).toBeGreaterThan(0);
    } finally {
      await pool.destroy();
    }
  });
});
