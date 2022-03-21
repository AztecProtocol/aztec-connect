/// <reference types="node" />
import { Blake2s } from '../crypto/blake2s';
import { AliasHash } from './alias_hash';
export declare class AccountAliasId {
    aliasHash: AliasHash;
    accountNonce: number;
    static ZERO: AccountAliasId;
    constructor(aliasHash: AliasHash, accountNonce: number);
    static fromAlias(alias: string, accountNonce: number, blake2s: Blake2s): AccountAliasId;
    static random(): AccountAliasId;
    static fromBuffer(id: Buffer): AccountAliasId;
    toBuffer(): Buffer;
    toString(): string;
    equals(rhs: AccountAliasId): boolean;
}
//# sourceMappingURL=account_alias_id.d.ts.map