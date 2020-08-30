import { Prover } from './prover';
import { WorkerPool } from '../../wasm/worker_pool';
import { Pippenger, PooledPippenger } from '../../pippenger';
import { Fft, PooledFft } from '../../fft';

export class PooledProverFactory {
  private pippenger?: Pippenger;
  private fft: { [key: number]: Fft } = {};

  constructor(private pool: WorkerPool, private crsData: Uint8Array) {}

  async createProver(circuitSize: number) {
    if (!this.pippenger) {
      const pippenger = new PooledPippenger();
      await pippenger.init(this.crsData, this.pool);
      this.pippenger = pippenger;
    }

    if (!this.fft[circuitSize]) {
      const fft = new PooledFft(this.pool);
      await fft.init(circuitSize);
      this.fft[circuitSize] = fft;
    }

    return new Prover(this.pool.workers[0], this.pippenger, this.fft[circuitSize]);
  }
}
