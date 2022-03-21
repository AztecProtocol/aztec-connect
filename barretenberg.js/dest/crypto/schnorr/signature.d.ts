/// <reference types="node" />
export declare class SchnorrSignature {
    private buffer;
    constructor(buffer: Buffer);
    static isSignature(signature: string): boolean;
    static fromString(signature: string): SchnorrSignature;
    static randomSignature(): SchnorrSignature;
    s(): Buffer;
    e(): Buffer;
    toBuffer(): Buffer;
    toString(): string;
}
//# sourceMappingURL=signature.d.ts.map