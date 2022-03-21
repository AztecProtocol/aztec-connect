/// <reference types="node" />
import { AccountAliasId } from '../../account_id';
import { GrumpkinAddress } from '../../address';
import { HashPath } from '../../merkle_tree';
export declare class AccountTx {
    merkleRoot: Buffer;
    accountPublicKey: GrumpkinAddress;
    newAccountPublicKey: GrumpkinAddress;
    newSigningPubKey1: GrumpkinAddress;
    newSigningPubKey2: GrumpkinAddress;
    accountAliasId: AccountAliasId;
    migrate: boolean;
    accountIndex: number;
    accountPath: HashPath;
    signingPubKey: GrumpkinAddress;
    constructor(merkleRoot: Buffer, accountPublicKey: GrumpkinAddress, newAccountPublicKey: GrumpkinAddress, newSigningPubKey1: GrumpkinAddress, newSigningPubKey2: GrumpkinAddress, accountAliasId: AccountAliasId, migrate: boolean, accountIndex: number, accountPath: HashPath, signingPubKey: GrumpkinAddress);
    toBuffer(): Buffer;
}
//# sourceMappingURL=account_tx.d.ts.map