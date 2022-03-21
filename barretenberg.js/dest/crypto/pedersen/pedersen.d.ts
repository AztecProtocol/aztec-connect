/// <reference types="node" />
import { BarretenbergWasm } from '../../wasm';
import { BarretenbergWorker } from '../../wasm/worker';
/**
 * Single threaded implementation of pedersen.
 */
export declare class Pedersen {
    private wasm;
    private worker;
    /**
     * Long running functions can execute on a worker. If none is provided, call the wasm on the calling thread.
     *
     * @param wasm Synchronous functions will use use this wasm directly on the calling thread.
     * @param worker Asynchronous functions execute on this worker, preventing blocking the calling thread.
     */
    constructor(wasm: BarretenbergWasm, worker?: BarretenbergWorker);
    init(): Promise<void>;
    compress(lhs: Uint8Array, rhs: Uint8Array): Buffer;
    compressInputs(inputs: Buffer[]): Buffer;
    compressWithHashIndex(inputs: Buffer[], hashIndex: number): Buffer;
    hashToField(data: Buffer): Buffer;
    hashToTree(values: Buffer[]): Promise<Buffer[]>;
}
//# sourceMappingURL=pedersen.d.ts.map