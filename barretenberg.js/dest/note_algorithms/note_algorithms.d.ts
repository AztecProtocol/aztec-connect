/// <reference types="node" />
import { AccountAliasId, AccountId } from '../account_id';
import { BarretenbergWasm } from '../wasm';
import { BarretenbergWorker } from '../wasm/worker';
import { DefiInteractionNote } from './defi_interaction_note';
import { TreeClaimNote } from './tree_claim_note';
import { TreeNote } from './tree_note';
import { GrumpkinAddress } from '../address';
export declare class NoteAlgorithms {
    private wasm;
    private worker;
    constructor(wasm: BarretenbergWasm, worker?: BarretenbergWorker);
    valueNoteNullifier(noteCommitment: Buffer, accountPrivateKey: Buffer, real?: boolean): Buffer;
    valueNoteNullifierBigInt(noteCommitment: Buffer, accountPrivateKey: Buffer, real?: boolean): bigint;
    valueNoteCommitment(note: TreeNote): Buffer;
    valueNotePartialCommitment(noteSecret: Buffer, owner: AccountId): Buffer;
    claimNotePartialCommitment(note: TreeClaimNote): Buffer;
    claimNoteCompletePartialCommitment(partialNote: Buffer, interactionNonce: number, fee: bigint): Buffer;
    claimNoteCommitment(note: TreeClaimNote): Buffer;
    claimNoteNullifier(noteCommitment: Buffer): Buffer;
    defiInteractionNoteCommitment(note: DefiInteractionNote): Buffer;
    accountNoteCommitment(accountAliasId: AccountAliasId, publicKey: GrumpkinAddress, signingKey: Buffer): Buffer;
    accountAliasIdNullifier(accountAliasId: AccountAliasId): Buffer;
    batchDecryptNotes(keysBuf: Buffer, privateKey: Buffer): Promise<Buffer>;
}
//# sourceMappingURL=note_algorithms.d.ts.map