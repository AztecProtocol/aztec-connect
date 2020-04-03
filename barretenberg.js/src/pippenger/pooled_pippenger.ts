import { Pippenger } from './pippenger';
import { SinglePippenger } from './single_pippenger';
import { createWorker, destroyWorker } from '../wasm/worker_factory';
import { BarretenbergWorker } from '../wasm/worker';
import { ModuleThread } from 'threads';
import createDebug from 'debug';

const debug = createDebug('pippenger')

export class PooledPippenger implements Pippenger {
  private workers: ModuleThread<BarretenbergWorker>[] = [];
  private pool: SinglePippenger[] = [];

  constructor(private wasm: BarretenbergWorker) {}

  public async init(module: WebAssembly.Module, crsData: Uint8Array, poolSize: number) {
    this.workers = await Promise.all(
      Array(poolSize)
        .fill(0)
        .map((_,i) => createWorker(`pippenger_child_${i}`))
    );
    this.pool = await Promise.all(this.workers.map(async w => {
      await w.init(module);
      const p = new SinglePippenger(w);
      await p.init(crsData);
      return p;
    }));
  }

  public async destroy() {
    await Promise.all(this.workers.map(destroyWorker));
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
    const mem = await this.wasm.call('bbmalloc', buffer.length);
    await this.wasm.transferToHeap(buffer, mem);
    await this.wasm.call('g1_sum', mem, buffer.length / 96, 0);
    await this.wasm.call('bbfree', mem);
    return Buffer.from(await this.wasm.sliceMemory(0, 96));
  }
}
