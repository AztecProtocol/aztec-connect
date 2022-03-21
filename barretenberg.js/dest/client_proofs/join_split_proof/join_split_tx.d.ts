/// <reference types="node" />
import { AccountAliasId } from '../../account_id';
import { EthAddress, GrumpkinAddress } from '../../address';
import { HashPath } from '../../merkle_tree';
import { ClaimNoteTxData, TreeNote } from '../../note_algorithms';
export declare class JoinSplitTx {
    proofId: number;
    publicValue: bigint;
    publicOwner: EthAddress;
    publicAssetId: number;
    numInputNotes: number;
    inputNoteIndices: number[];
    merkleRoot: Buffer;
    inputNotePaths: HashPath[];
    inputNotes: TreeNote[];
    outputNotes: TreeNote[];
    claimNote: ClaimNoteTxData;
    accountPrivateKey: Buffer;
    accountAliasId: AccountAliasId;
    accountIndex: number;
    accountPath: HashPath;
    signingPubKey: GrumpkinAddress;
    backwardLink: Buffer;
    allowChain: number;
    constructor(proofId: number, publicValue: bigint, publicOwner: EthAddress, publicAssetId: number, numInputNotes: number, inputNoteIndices: number[], merkleRoot: Buffer, inputNotePaths: HashPath[], inputNotes: TreeNote[], outputNotes: TreeNote[], claimNote: ClaimNoteTxData, accountPrivateKey: Buffer, accountAliasId: AccountAliasId, accountIndex: number, accountPath: HashPath, signingPubKey: GrumpkinAddress, backwardLink: Buffer, allowChain: number);
    toBuffer(): Buffer;
}
//# sourceMappingURL=join_split_tx.d.ts.map