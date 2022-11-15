import { createDebugLogger } from '../log/index.js';
import { BarretenbergWasm } from './barretenberg_wasm.js';
import { createWorker } from './worker_factory.js';
import { BarretenbergWorker } from './barretenberg_worker.js';

const debug = createDebugLogger('bb:worker_pool');

/**
 * Allocates a pool of barretenberg workers.
 * The static new takes a pre-existing BarretenbergWasm which can be reused when recreating the workers, saving on
 * re-parsing the code etc.
 * Worker 0 is allocated MAX_PAGES memory pages. This is because worker 0 will need to hold the proving key
 * (i.e. has state), whereas the others are pure compute (they hold a little crs state).
 */
export class WorkerPool {
  public static MAX_PAGES = 6660;
  public workers: BarretenbergWorker[] = [];

  static async new(barretenberg: BarretenbergWasm, poolSize: number) {
    const pool = new WorkerPool();
    await pool.init(barretenberg.module, poolSize);
    return pool;
  }

  public async init(module: WebAssembly.Module, poolSize: number, maxMem = WorkerPool.MAX_PAGES) {
    debug(`creating ${poolSize} workers...`);
    const start = new Date().getTime();
    this.workers = await Promise.all(
      Array(poolSize)
        .fill(0)
        .map((_, i) => createWorker(`${i}`, module, i === 0 ? Math.min(WorkerPool.MAX_PAGES, maxMem) : 768, maxMem)),
    );

    debug(`created workers: ${new Date().getTime() - start}ms`);
  }

  public async destroy() {
    await Promise.all(this.workers.map(w => w.destroyWorker()));
  }
}
