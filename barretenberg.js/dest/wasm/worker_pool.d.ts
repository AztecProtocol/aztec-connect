import { BarretenbergWorker } from './worker';
import { ModuleThread } from 'threads';
import { BarretenbergWasm } from '.';
export declare class WorkerPool {
    workers: ModuleThread<BarretenbergWorker>[];
    static new(barretenberg: BarretenbergWasm, poolSize: number): Promise<WorkerPool>;
    init(module: WebAssembly.Module, poolSize: number): Promise<void>;
    destroy(): Promise<void>;
}
//# sourceMappingURL=worker_pool.d.ts.map