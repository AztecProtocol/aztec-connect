/// <reference types="node" />
import { BarretenbergWasm } from '../../wasm';
export declare class Sha256 {
    private wasm;
    constructor(wasm: BarretenbergWasm);
    hash(data: Buffer): Buffer;
}
//# sourceMappingURL=index.d.ts.map