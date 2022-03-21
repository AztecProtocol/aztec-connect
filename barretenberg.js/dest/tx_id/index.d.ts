/// <reference types="node" />
export declare class TxId {
    private buffer;
    constructor(buffer: Buffer);
    static deserialize(buffer: Buffer, offset: number): {
        elem: TxId;
        adv: number;
    };
    static fromString(hash: string): TxId;
    static random(): TxId;
    equals(rhs: TxId): boolean;
    toBuffer(): Buffer;
    toString(): string;
    toDepositSigningData(): Buffer;
}
//# sourceMappingURL=index.d.ts.map