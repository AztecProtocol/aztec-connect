import { AliasHash } from '../account_id';
import { GrumpkinAddress } from '../address';
import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { BarretenbergWasm } from '../wasm';
import { DefiInteractionNote } from './defi_interaction_note';
import { TreeClaimNote } from './tree_claim_note';
import { TreeNote } from './tree_note';

export class NoteAlgorithms {
  constructor(private wasm: BarretenbergWasm) {}

  public valueNoteNullifier(noteCommitment: Buffer, accountPrivateKey: Buffer, real = true) {
    this.wasm.transferToHeap(noteCommitment, 0);
    this.wasm.transferToHeap(accountPrivateKey, 64);
    this.wasm.call('notes__value_note_nullifier', 0, 64, real, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public valueNoteNullifierBigInt(noteCommitment: Buffer, accountPrivateKey: Buffer, real = true) {
    return toBigIntBE(this.valueNoteNullifier(noteCommitment, accountPrivateKey, real));
  }

  public valueNoteCommitment(note: TreeNote) {
    const noteBuf = note.toBuffer();
    const mem = this.wasm.call('bbmalloc', noteBuf.length);
    this.wasm.transferToHeap(noteBuf, mem);
    this.wasm.call('notes__value_note_commitment', mem, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public valueNotePartialCommitment(noteSecret: Buffer, owner: GrumpkinAddress, accountRequired: boolean) {
    this.wasm.transferToHeap(noteSecret, 0);
    this.wasm.transferToHeap(owner.toBuffer(), 32);
    // Currently this is only used for creating the value notes from a claim note.
    // Given these notes are owned by the creator of the claim note, we can leave creator pubkey as 0.
    this.wasm.transferToHeap(Buffer.alloc(32), 96);
    this.wasm.call('notes__value_note_partial_commitment', 0, 32, 96, accountRequired, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public claimNotePartialCommitment(note: TreeClaimNote) {
    const noteBuf = note.toBuffer();
    const mem = this.wasm.call('bbmalloc', noteBuf.length);
    this.wasm.transferToHeap(noteBuf, mem);
    this.wasm.call('notes__claim_note_partial_commitment', mem, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public claimNoteCompletePartialCommitment(partialNote: Buffer, interactionNonce: number, fee: bigint) {
    this.wasm.transferToHeap(partialNote, 0);
    this.wasm.transferToHeap(toBufferBE(fee, 32), 32);
    this.wasm.call('notes__claim_note_complete_partial_commitment', 0, interactionNonce, 32, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public claimNoteCommitment(note: TreeClaimNote) {
    const partial = this.claimNotePartialCommitment(note);
    return this.claimNoteCompletePartialCommitment(partial, note.defiInteractionNonce, note.fee);
  }

  public claimNoteNullifier(noteCommitment: Buffer) {
    this.wasm.transferToHeap(noteCommitment, 0);
    this.wasm.call('notes__claim_note_nullifier', 0, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public defiInteractionNoteCommitment(note: DefiInteractionNote) {
    const noteBuf = note.toBuffer();
    const mem = this.wasm.call('bbmalloc', noteBuf.length);
    this.wasm.transferToHeap(noteBuf, mem);
    this.wasm.call('notes__defi_interaction_note_commitment', mem, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public accountNoteCommitment(aliasHash: AliasHash, accountPublicKey: GrumpkinAddress, spendingPublicKey: Buffer) {
    this.wasm.transferToHeap(aliasHash.toBuffer32(), 0);
    this.wasm.transferToHeap(accountPublicKey.toBuffer(), 32);
    this.wasm.transferToHeap(spendingPublicKey, 64);
    this.wasm.call('notes__account_note_commitment', 0, 32, 64, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public accountAliasHashNullifier(aliasHash: AliasHash) {
    this.wasm.transferToHeap(aliasHash.toBuffer32(), 0);
    this.wasm.call('notes__compute_account_alias_hash_nullifier', 0, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public accountPublicKeyNullifier(accountPublicKey: GrumpkinAddress) {
    this.wasm.transferToHeap(accountPublicKey.toBuffer(), 0);
    this.wasm.call('notes__compute_account_public_key_nullifier', 0, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }
}
