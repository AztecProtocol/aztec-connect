/// <reference types="node" />
import { Pedersen } from './pedersen';
import { WorkerPool } from '../../wasm/worker_pool';
import { BarretenbergWasm } from '../../wasm';
/**
 * Multi-threaded implementation of pedersen.
 */
export declare class PooledPedersen extends Pedersen {
    pool: Pedersen[];
    /**
     * @param wasm Synchronous functions will use use this wasm directly on the calling thread.
     * @param pool Asynchronous functions use this pool of workers to multi-thread processing.
     */
    constructor(wasm: BarretenbergWasm, pool: WorkerPool);
    init(): Promise<void>;
    hashToTree(values: Buffer[]): Promise<Buffer[]>;
}
//# sourceMappingURL=pooled_pedersen.d.ts.map