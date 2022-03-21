import { BarretenbergWorker } from '../../wasm/worker';
import { Pippenger } from '../../pippenger';
import { Fft } from '../../fft';
import { Prover } from './prover';
/**
 * An UnrolledProver is used for proofs that are verified inside a another snark (e.g. the rollup).
 */
export declare class UnrolledProver extends Prover {
    constructor(wasm: BarretenbergWorker, pippenger: Pippenger, fft: Fft);
}
//# sourceMappingURL=unrolled_prover.d.ts.map