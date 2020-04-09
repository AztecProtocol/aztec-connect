import { BarretenbergWorker } from './worker';
import { ModuleThread } from 'threads';
import createDebug from 'debug';
import { createWorker, destroyWorker } from './worker_factory';

const debug = createDebug('bb:worker_pool');

export class WorkerPool {
  public workers: ModuleThread<BarretenbergWorker>[] = [];

  public async init(poolSize: number) {
    debug(`creating ${poolSize} workers...`);
    const start = new Date().getTime();
    const mainWorker = await createWorker('0');
    const module = await mainWorker.init();
    this.workers.push(mainWorker);
    const workers = await Promise.all(Array(poolSize-1).fill(0).map((_,i) => this.initWorker(module, i)));
    this.workers = [mainWorker, ...workers];
    debug(`created workers: ${new Date().getTime() - start}ms`);
  }

  private async initWorker(module: WebAssembly.Module, i: number) {
    const w = await createWorker(`${i}`);
    await w.init(module);
    return w;
  }

  public async destroy() {
    await Promise.all(this.workers.map(destroyWorker));
  }
}
