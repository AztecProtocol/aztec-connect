import createDebug from 'debug';
import { WorkerPool } from '../wasm/worker_pool';
import { MemoryFifo } from '../fifo';
import { SingleFft } from './single_fft';

const debug = createDebug('bb:fft');

interface Job {
  coefficients: Uint8Array;
  constant?: Uint8Array;
  inverse: boolean;
  resolve: (r: Uint8Array) => void;
}

export class PooledFft {
  private queue = new MemoryFifo<Job>();
  private ffts: SingleFft[];

  constructor(pool: WorkerPool) {
    this.ffts = pool.workers.map(w => new SingleFft(w));
  }

  public async init(circuitSize: number) {
    const start = new Date().getTime();
    debug(`initializing: ${new Date().getTime() - start}ms`);
    await Promise.all(this.ffts.map(f => f.init(circuitSize)))
    this.ffts.forEach(async (w) => this.processJobs(w));
    debug(`initalization took: ${new Date().getTime() - start}ms`);
  }

  public destroy() {
    this.queue.cancel();
  }

  private async processJobs(worker: SingleFft) {
    while (true) {
      const job = await this.queue.get();
      if (!job) {
        break;
      }
      const result = await (job.inverse
        ? worker.ifft(job.coefficients)
        : worker.fft(job.coefficients, job.constant!));
      job.resolve(result);
    }
  }

  public async fft(coefficients: Uint8Array, constant: Uint8Array): Promise<Uint8Array> {
    return await new Promise((resolve) => this.queue.put({ coefficients, constant, inverse: false, resolve }));
  }

  public async ifft(coefficients: Uint8Array): Promise<Uint8Array> {
    return await new Promise((resolve) => this.queue.put({ coefficients, inverse: true, resolve }));
  }
}
