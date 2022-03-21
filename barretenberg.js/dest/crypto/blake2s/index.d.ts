/// <reference types="node" />
import { BarretenbergWasm } from '../../wasm';
export declare class Blake2s {
    private wasm;
    constructor(wasm: BarretenbergWasm);
    hashToField(data: Uint8Array): Buffer;
}
//# sourceMappingURL=index.d.ts.map