/// <reference types="node" />
export declare type DeserializeFn<T> = (buf: Buffer, offset: number) => {
    elem: T;
    adv: number;
};
export declare function numToUInt32BE(n: number, bufferSize?: number): Buffer;
export declare function numToInt32BE(n: number, bufferSize?: number): Buffer;
export declare function numToUInt8(n: number): Buffer;
export declare function serializeBufferToVector(buf: Buffer): Buffer;
export declare function serializeBigInt(n: bigint, width?: number): Buffer;
export declare function deserializeBigInt(buf: Buffer, offset?: number, width?: number): {
    elem: bigint;
    adv: number;
};
export declare function serializeDate(date: Date): Buffer;
export declare function deserializeBufferFromVector(vector: Buffer, offset?: number): {
    elem: Buffer;
    adv: number;
};
export declare function deserializeUInt32(buf: Buffer, offset?: number): {
    elem: number;
    adv: number;
};
export declare function deserializeInt32(buf: Buffer, offset?: number): {
    elem: number;
    adv: number;
};
export declare function deserializeField(buf: Buffer, offset?: number): {
    elem: Buffer;
    adv: number;
};
export declare function serializeBufferArrayToVector(arr: Buffer[]): Buffer;
export declare function deserializeArrayFromVector<T>(deserialize: (buf: Buffer, offset: number) => {
    elem: T;
    adv: number;
}, vector: Buffer, offset?: number): {
    elem: T[];
    adv: number;
};
export declare class Deserializer {
    private buf;
    private offset;
    constructor(buf: Buffer, offset?: number);
    uInt32(): number;
    int32(): number;
    bigInt(width?: number): bigint;
    buffer(): Buffer;
    date(): Date;
    deserializeArray<T>(fn: DeserializeFn<T>): T[];
    exec<T>(fn: DeserializeFn<T>): T;
    getOffset(): number;
}
//# sourceMappingURL=index.d.ts.map