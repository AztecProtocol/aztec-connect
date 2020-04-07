import createDebug from 'debug';
import { WorkerPool } from '../wasm/worker_pool';
import { MemoryFifo } from '../fifo';
import { BarretenbergWorker } from '../wasm/worker';

const debug = createDebug('bb:fft');

interface Job {
  coefficients: Uint8Array;
  constant?: Uint8Array;
  inverse: boolean;
  resolve: (r: Uint8Array) => void;
}

export class PooledFft {
  private queue = new MemoryFifo<Job>();

  constructor(private pool: WorkerPool) {}

  public async init() {
    this.pool.workers.forEach(async (w) => this.processJobs(w));
  }

  public destroy() {
    this.queue.cancel();
  }

  private async processJobs(worker: BarretenbergWorker) {
    while (true) {
      const job = await this.queue.get();
      if (!job) {
        break;
      }
      const result = await (job.inverse
        ? this.ifftInternal(worker, job.coefficients)
        : this.fftInternal(worker, job.coefficients, job.constant!));
      job.resolve(result);
    }
  }

  public async fft(coefficients: Uint8Array, constant: Uint8Array): Promise<Uint8Array> {
    return await new Promise((resolve) => this.queue.put({ coefficients, constant, inverse: false, resolve }));
  }

  public async ifft(coefficients: Uint8Array): Promise<Uint8Array> {
    return await new Promise((resolve) => this.queue.put({ coefficients, inverse: true, resolve }));
  }

  private async fftInternal(worker: BarretenbergWorker, coefficients: Uint8Array, constant: Uint8Array) {
    const circuitSize = coefficients.length / 32;
    const newPtr = await worker.call('bbmalloc', coefficients.length);
    await worker.transferToHeap(coefficients, newPtr);
    await worker.transferToHeap(constant, 0);
    await worker.call('coset_fft_with_generator_shift', circuitSize, newPtr, 0);
    const result = await worker.sliceMemory(newPtr, newPtr + circuitSize * 32);
    await worker.call('bbfree', newPtr);
    return result;
  }

  private async ifftInternal(worker: BarretenbergWorker, coefficients: Uint8Array) {
    const circuitSize = coefficients.length / 32;
    const newPtr = await worker.call('bbmalloc', coefficients.length);
    await worker.transferToHeap(coefficients, newPtr);
    await worker.call('ifft', circuitSize, newPtr);
    const result = await worker.sliceMemory(newPtr, newPtr + circuitSize * 32);
    await worker.call('bbfree', newPtr);
    return result;
  }
}
