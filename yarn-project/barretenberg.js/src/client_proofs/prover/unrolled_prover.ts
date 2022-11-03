import { Fft } from '../../fft/index.js';
import { Pippenger } from '../../pippenger/index.js';
import { BarretenbergWasm, BarretenbergWorker } from '../../wasm/index.js';
import { Prover } from './prover.js';

/**
 * An UnrolledProver is used for proofs that are verified inside a another snark (e.g. the rollup).
 */
export class UnrolledProver extends Prover {
  constructor(wasm: BarretenbergWorker | BarretenbergWasm, pippenger: Pippenger, fft: Fft) {
    super(wasm, pippenger, fft, 'unrolled_');
  }
}
