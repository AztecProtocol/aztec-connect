/// <reference types="node" />
import { BarretenbergWasm } from '../../wasm';
export declare class Aes128 {
    private wasm;
    constructor(wasm: BarretenbergWasm);
    encryptBufferCBC(data: Uint8Array, iv: Uint8Array, key: Uint8Array): Buffer;
    decryptBufferCBC(data: Uint8Array, iv: Uint8Array, key: Uint8Array): Buffer;
}
//# sourceMappingURL=index.d.ts.map