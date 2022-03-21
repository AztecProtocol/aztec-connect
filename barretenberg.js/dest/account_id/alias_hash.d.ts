/// <reference types="node" />
import { Blake2s } from '../crypto/blake2s';
export declare class AliasHash {
    private buffer;
    constructor(buffer: Buffer);
    static random(): AliasHash;
    static fromAlias(alias: string, blake2s: Blake2s): AliasHash;
    toBuffer(): Buffer;
    toBuffer32(): Buffer;
    toString(): string;
    equals(rhs: AliasHash): boolean;
}
//# sourceMappingURL=alias_hash.d.ts.map