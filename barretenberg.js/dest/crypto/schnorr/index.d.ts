/// <reference types="node" />
import { BarretenbergWasm } from '../../wasm';
import { SchnorrSignature } from './signature';
export * from './signature';
export declare class Schnorr {
    private wasm;
    constructor(wasm: BarretenbergWasm);
    constructSignature(msg: Uint8Array, pk: Uint8Array): SchnorrSignature;
    computePublicKey(pk: Uint8Array): Buffer;
    verifySignature(msg: Uint8Array, pubKey: Uint8Array, sig: SchnorrSignature): boolean;
}
//# sourceMappingURL=index.d.ts.map