/// <reference types="node" />
import { Pippenger } from './pippenger';
import { SinglePippenger } from './single_pippenger';
import { WorkerPool } from '../wasm/worker_pool';
export declare class PooledPippenger implements Pippenger {
    pool: SinglePippenger[];
    init(crsData: Uint8Array, pool: WorkerPool): Promise<void>;
    pippengerUnsafe(scalars: Uint8Array, from: number, range: number): Promise<Buffer>;
    sumElements(buffer: Uint8Array): Promise<Buffer>;
}
//# sourceMappingURL=pooled_pippenger.d.ts.map