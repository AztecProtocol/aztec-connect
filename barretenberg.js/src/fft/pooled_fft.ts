import { createDebugLogger } from '../log';
import { MemoryFifo } from '../fifo';
import { WorkerPool } from '../wasm/worker_pool';
import { Fft, FftFactory } from './fft';
import { SingleFft } from './single_fft';

const debug = createDebugLogger('bb:fft');

interface Job {
  coefficients: Uint8Array;
  constant?: Uint8Array;
  inverse: boolean;
  resolve: (r: Uint8Array) => void;
}

export class PooledFft implements Fft {
  private queue = new MemoryFifo<Job>();
  private ffts: SingleFft[];

  constructor(pool: WorkerPool) {
    this.ffts = pool.workers.map(w => new SingleFft(w));
  }

  public async init(circuitSize: number) {
    const start = new Date().getTime();
    debug(`initializing fft of size: ${circuitSize}`);
    await Promise.all(this.ffts.map(f => f.init(circuitSize)));
    this.ffts.forEach(w => this.processJobs(w));
    debug(`initialization took: ${new Date().getTime() - start}ms`);
  }

  public async destroy() {
    this.queue.cancel();
    await Promise.all(this.ffts.map(f => f.destroy()));
  }

  private async processJobs(worker: SingleFft) {
    while (true) {
      const job = await this.queue.get();
      if (!job) {
        break;
      }
      const result = await (job.inverse ? worker.ifft(job.coefficients) : worker.fft(job.coefficients, job.constant!));
      job.resolve(result);
    }
  }

  public async fft(coefficients: Uint8Array, constant: Uint8Array): Promise<Uint8Array> {
    return await new Promise(resolve => this.queue.put({ coefficients, constant, inverse: false, resolve }));
  }

  public async ifft(coefficients: Uint8Array): Promise<Uint8Array> {
    return await new Promise(resolve => this.queue.put({ coefficients, inverse: true, resolve }));
  }
}

export class PooledFftFactory implements FftFactory {
  private ffts: { [circuitSize: number]: PooledFft } = {};

  constructor(private workerPool: WorkerPool) {}

  public async createFft(circuitSize: number) {
    if (!this.ffts[circuitSize]) {
      const fft = new PooledFft(this.workerPool);
      await fft.init(circuitSize);
      this.ffts[circuitSize] = fft;
    }
    return this.ffts[circuitSize];
  }

  public async destroy() {
    await Promise.all(Object.values(this.ffts).map(fft => fft.destroy()));
  }
}
