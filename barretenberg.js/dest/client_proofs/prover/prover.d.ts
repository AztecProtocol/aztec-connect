/// <reference types="node" />
import { BarretenbergWorker } from '../../wasm/worker';
import { Pippenger } from '../../pippenger';
import { Fft } from '../../fft';
/**
 * A Prover is composed of a single underlying worker (`wasm`), and implementations of Pippenger and Fft, which may
 * or may not be backed multiple wasm workers on which they execute their algorithms.
 *
 * The single given worker, must be the worker within which any proof generators will initialise their proving keys,
 * and must be the worker within which the given `proverPtr` exists.
 *
 * The `getWorker()` method should be used by proof generation components to return the worker on which to make their
 * appropriate wasmCalls.
 *
 * Given that the Fft implementation is provided in the constructor, a Prover is fixed to whatever circuit size the
 * Fft implementation was initialised with.
 */
export declare class Prover {
    private wasm;
    private pippenger;
    private fft;
    private callPrefix;
    constructor(wasm: BarretenbergWorker, pippenger: Pippenger, fft: Fft, callPrefix?: string);
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
    private proverCall;
    createProof(proverPtr: number): Promise<Buffer>;
    private processProverQueue;
    private doFft;
    private doIfft;
}
//# sourceMappingURL=prover.d.ts.map