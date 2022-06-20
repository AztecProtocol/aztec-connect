import { Pippenger } from './pippenger';
import { SinglePippenger } from './single_pippenger';
import { createDebugLogger } from '../log';
import { WorkerPool } from '../wasm/worker_pool';

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

  public async pippengerUnsafe(scalars: Uint8Array, from: number, range: number) {
    const scalarsPerWorker = range / this.pool.length;
    const start = new Date().getTime();
    const results = await Promise.all(
      this.pool.map((p, i) => {
        const subset = scalars.slice(scalarsPerWorker * i * 32, scalarsPerWorker * (i + 1) * 32);
        return p.pippengerUnsafe(subset, scalarsPerWorker * i, scalarsPerWorker);
      }),
    );
    debug(`pippenger run took: ${new Date().getTime() - start}ms`);
    return await this.sumElements(Buffer.concat(results));
  }

  public async sumElements(buffer: Uint8Array) {
    return await this.pool[0].sumElements(buffer);
  }
}
