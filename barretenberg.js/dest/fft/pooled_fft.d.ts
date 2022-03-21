import { WorkerPool } from '../wasm/worker_pool';
import { Fft } from './fft';
export declare class PooledFft implements Fft {
    private queue;
    private ffts;
    constructor(pool: WorkerPool);
    init(circuitSize: number): Promise<void>;
    destroy(): Promise<void>;
    private processJobs;
    fft(coefficients: Uint8Array, constant: Uint8Array): Promise<Uint8Array>;
    ifft(coefficients: Uint8Array): Promise<Uint8Array>;
}
//# sourceMappingURL=pooled_fft.d.ts.map