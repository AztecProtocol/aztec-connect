import { Fft } from '../../fft';
import { Pippenger } from '../../pippenger';
import { BarretenbergWasm, BarretenbergWorker } from '../../wasm';
import { Prover } from './prover';

/**
 * An UnrolledProver is used for proofs that are verified inside a another snark (e.g. the rollup).
 */
export class UnrolledProver extends Prover {
  constructor(wasm: BarretenbergWorker | BarretenbergWasm, pippenger: Pippenger, fft: Fft) {
    super(wasm, pippenger, fft, 'unrolled_');
  }
}
