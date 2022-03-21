import { BarretenbergWorker } from './worker';
export declare function createWorker(id?: string, module?: WebAssembly.Module, initial?: number): Promise<import("threads").ModuleThread<{
    init(module?: WebAssembly.Module | undefined, initial?: number | undefined): Promise<void>;
    transferToHeap(buffer: Uint8Array, offset: number): Promise<void>;
    sliceMemory(start: number, end: number): Promise<Uint8Array>;
    call(name: string, ...args: any): Promise<number>;
    memSize(): Promise<number>;
    logs(): import("observable-fns").Observable<unknown>;
    acquire(): Promise<void>;
    release(): Promise<void>;
}>>;
export declare function destroyWorker(worker: BarretenbergWorker): Promise<void>;
//# sourceMappingURL=worker_factory.d.ts.map