/// <reference types="node" />
import { EventEmitter } from 'events';
export declare function fetchCode(): Promise<Buffer>;
export declare class BarretenbergWasm extends EventEmitter {
    private memory;
    private heap;
    private instance;
    private mutexQ;
    module: WebAssembly.Module;
    static new(name?: string, initial?: number): Promise<BarretenbergWasm>;
    constructor();
    init(module?: WebAssembly.Module, initial?: number): Promise<void>;
    exports(): any;
    /**
     * When returning values from the WASM, use >>> operator to convert signed representation to unsigned representation.
     */
    call(name: string, ...args: any): number;
    getMemory(): Uint8Array;
    sliceMemory(start: number, end: number): Uint8Array;
    transferToHeap(arr: Uint8Array, offset: number): void;
    /**
     * When calling the wasm, sometimes a caller will require exclusive access over a series of calls.
     * e.g. When a result is written to address 0, one cannot have another caller writing to the same address via
     * transferToHeap before the result is read via sliceMemory.
     * acquire() gets a single token from a fifo. The caller must call release() to add the token back.
     */
    acquire(): Promise<void>;
    release(): Promise<void>;
}
//# sourceMappingURL=barretenberg_wasm.d.ts.map