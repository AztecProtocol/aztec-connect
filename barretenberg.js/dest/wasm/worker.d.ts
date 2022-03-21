import { Observable } from 'threads/observable';
declare const worker: {
    init(module?: WebAssembly.Module | undefined, initial?: number | undefined): Promise<void>;
    transferToHeap(buffer: Uint8Array, offset: number): Promise<void>;
    sliceMemory(start: number, end: number): Promise<Uint8Array>;
    call(name: string, ...args: any): Promise<number>;
    memSize(): Promise<number>;
    logs(): Observable<unknown>;
    /**
     * When calling the wasm, sometimes a caller will require exclusive access over a series of calls.
     * e.g. When a result is written to address 0, one cannot have another caller writing to the same address via
     * transferToHeap before the result is read via sliceMemory.
     * acquire() gets a single token from a fifo. The caller must call release() to add the token back.
     */
    acquire(): Promise<void>;
    release(): Promise<void>;
};
export declare type BarretenbergWorker = typeof worker;
export {};
//# sourceMappingURL=worker.d.ts.map