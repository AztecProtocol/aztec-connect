/// <reference types="node" />
import { GrumpkinAddress } from '../address';
import { Grumpkin } from '../ecc/grumpkin';
export declare class ViewingKey {
    static SIZE: number;
    static EMPTY: ViewingKey;
    private buffer;
    constructor(buffer?: Buffer);
    static fromString(str: string): ViewingKey;
    static random(): ViewingKey;
    /**
     * Returns the AES encrypted "viewing key".
     * [AES: [32 bytes value][4 bytes assetId][4 bytes nonce][32 bytes creatorPubKey]] [64 bytes ephPubKey]
     * @param noteBuf = Buffer.concat([value, assetId, nonce, creatorPubKey]);
     * @param ownerPubKey - the public key contained within a value note
     * @param ephPrivKey - a random field element (also used alongside the ownerPubKey in deriving a value note's secret)
     */
    static createFromEphPriv(noteBuf: Buffer, ownerPubKey: GrumpkinAddress, ephPrivKey: Buffer, grumpkin: Grumpkin): ViewingKey;
    isEmpty(): boolean;
    equals(rhs: ViewingKey): boolean;
    toBuffer(): Buffer;
    toString(): string;
}
//# sourceMappingURL=index.d.ts.map