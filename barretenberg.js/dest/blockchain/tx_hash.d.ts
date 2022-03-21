/// <reference types="node" />
export declare class TxHash {
    private buffer;
    constructor(buffer: Buffer);
    static fromBuffer(buffer: Buffer): TxHash;
    static deserialize(buffer: Buffer, offset: number): {
        elem: TxHash;
        adv: number;
    };
    static fromString(hash: string): TxHash;
    static random(): TxHash;
    equals(rhs: TxHash): boolean;
    toBuffer(): Buffer;
    toString(): string;
}
//# sourceMappingURL=tx_hash.d.ts.map