/// <reference types="node" />
import { BarretenbergWasm } from '../../wasm';
export declare class Grumpkin {
    private wasm;
    constructor(wasm: BarretenbergWasm);
    static one: Buffer;
    mul(point: Uint8Array, scalar: Uint8Array): Buffer;
    batchMul(points: Uint8Array, scalar: Uint8Array, numPoints: number): Buffer;
    getRandomFr(): Buffer;
    reduce512BufferToFr(uint512Buf: Buffer): Buffer;
}
//# sourceMappingURL=index.d.ts.map