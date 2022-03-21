/// <reference types="node" />
export declare class EthAddress {
    private buffer;
    static ZERO: EthAddress;
    constructor(buffer: Buffer);
    static fromString(address: string): EthAddress;
    static randomAddress(): EthAddress;
    static isAddress(address: string): boolean;
    isZero(): boolean;
    static checkAddressChecksum(address: string): boolean;
    static toChecksumAddress(address: string): string;
    equals(rhs: EthAddress): boolean;
    toString(): string;
    toBuffer(): Buffer;
    toBuffer32(): Buffer;
}
//# sourceMappingURL=eth_address.d.ts.map