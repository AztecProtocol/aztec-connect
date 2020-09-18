import { Prover } from './prover';
import { WorkerPool } from '../../wasm/worker_pool';
import { PooledPippenger } from '../../pippenger';
import { Fft, PooledFft } from '../../fft';
import { UnrolledProver } from './unrolled_prover';

export class PooledProverFactory {
  public pippenger?: PooledPippenger;
  private fft: { [key: number]: Fft } = {};

  constructor(private pool: WorkerPool, private crsData: Uint8Array) {}

  private async init(circuitSize: number) {
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
  }

  async createProver(circuitSize: number) {
    await this.init(circuitSize);
    return new Prover(this.pool.workers[0], this.pippenger!, this.fft[circuitSize]);
  }

  async createUnrolledProver(circuitSize: number) {
    await this.init(circuitSize);
    return new UnrolledProver(this.pool.workers[0], this.pippenger!, this.fft[circuitSize]);
  }
}
