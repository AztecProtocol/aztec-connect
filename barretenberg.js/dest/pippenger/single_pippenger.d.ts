/// <reference types="node" />
import { BarretenbergWorker } from '../wasm/worker';
import { Pippenger } from './pippenger';
export declare class SinglePippenger implements Pippenger {
    private wasm;
    private pippengerPtr;
    private numPoints;
    constructor(wasm: BarretenbergWorker);
    init(crsData: Uint8Array): Promise<void>;
    destroy(): Promise<void>;
    pippengerUnsafe(scalars: Uint8Array, from: number, range: number): Promise<Buffer>;
    sumElements(buffer: Uint8Array): Promise<Buffer>;
    getPointer(): number;
    getWorker(): {
        init(module?: WebAssembly.Module | undefined, initial?: number | undefined): Promise<void>;
        transferToHeap(buffer: Uint8Array, offset: number): Promise<void>;
        sliceMemory(start: number, end: number): Promise<Uint8Array>;
        call(name: string, ...args: any): Promise<number>;
        memSize(): Promise<number>;
        logs(): import("observable-fns").Observable<unknown>;
        acquire(): Promise<void>;
        release(): Promise<void>;
    };
}
//# sourceMappingURL=single_pippenger.d.ts.map