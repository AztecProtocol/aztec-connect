import { Pippenger } from './pippenger.js';
import { SinglePippenger } from './single_pippenger.js';
import { createDebugLogger } from '../log/index.js';
import { WorkerPool } from '../wasm/index.js';

const debug = createDebugLogger('bb:pippenger');

export class PooledPippenger implements Pippenger {
  public pool: SinglePippenger[] = [];

  constructor(private workerPool: WorkerPool) {}

  public async init(crsData: Uint8Array) {
    const start = new Date().getTime();
    debug(`initializing: ${new Date().getTime() - start}ms`);
    this.pool = await Promise.all(
      this.workerPool.workers.map(async w => {
        const p = new SinglePippenger(w);
        await p.init(crsData);
        return p;
      }),
    );
    debug(`initialization took: ${new Date().getTime() - start}ms`);
  }

  public async destroy() {
    for (const p of this.pool) {
      await p.destroy();
    }
  }

  public async pippengerUnsafe(scalars: Uint8Array, from: number, range: number) {
    const scalarsPerWorker = Math.floor(range / this.pool.length);
    const start = new Date().getTime();
    const results = await Promise.all(
      this.pool.map((p, i) => {
        const rangePerWorker =
          i < this.pool.length - 1 ? scalarsPerWorker : range - scalarsPerWorker * (this.pool.length - 1);
        const subset = scalars.slice(scalarsPerWorker * i * 32, (scalarsPerWorker * i + rangePerWorker) * 32);
        return p.pippengerUnsafe(subset, scalarsPerWorker * i, rangePerWorker);
      }),
    );
    debug(`pippenger run took: ${new Date().getTime() - start}ms`);
    return await this.sumElements(Buffer.concat(results));
  }

  public async sumElements(buffer: Uint8Array) {
    return await this.pool[0].sumElements(buffer);
  }
}
