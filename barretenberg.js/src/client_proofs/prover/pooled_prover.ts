import { Prover } from './index';
import { WorkerPool } from '../../wasm/worker_pool';
import { BarretenbergWorker } from '../../wasm/worker';
import { Pippenger, PooledPippenger } from '../../pippenger';
import { Fft, PooledFft } from '../../fft';
import { BarretenbergWasm } from '../../wasm';

export class PooledProver extends Prover {
  constructor(private pool: WorkerPool, wasm: BarretenbergWorker, pippenger: Pippenger, fft: Fft) {
    super(wasm, pippenger, fft);
  }

  static async new(barretenberg: BarretenbergWasm, crsData: Uint8Array, circuitSize: number, workers: number) {
    const pool = new WorkerPool();
    await pool.init(barretenberg.module, workers);

    const barretenbergWorker = pool.workers[0];

    const pippenger = new PooledPippenger();
    await pippenger.init(crsData, pool);

    const fft = new PooledFft(pool);
    await fft.init(circuitSize);

    return new PooledProver(pool, barretenbergWorker, pippenger, fft);
  }

  async destroy() {
    await this.pool.destroy();
  }
}