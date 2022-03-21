import { Prover } from './prover';
import { WorkerPool } from '../../wasm/worker_pool';
import { UnrolledProver } from './unrolled_prover';
export declare class PooledProverFactory {
    private pool;
    private crsData;
    private pippenger?;
    private fft;
    constructor(pool: WorkerPool, crsData: Uint8Array);
    private init;
    createProver(circuitSize: number): Promise<Prover>;
    createUnrolledProver(circuitSize: number): Promise<UnrolledProver>;
}
//# sourceMappingURL=pooled_prover_factory.d.ts.map