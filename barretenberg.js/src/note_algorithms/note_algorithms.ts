import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { AccountAliasId, AccountId } from '../account_id';
import { ViewingKey } from '../viewing_key';
import { BarretenbergWasm } from '../wasm';
import { BarretenbergWorker } from '../wasm/worker';
import { DefiInteractionNote } from './defi_interaction_note';
import { TreeClaimNote } from './tree_claim_note';
import { TreeNote } from './tree_note';
import { GrumpkinAddress } from '../address';

export class NoteAlgorithms {
  constructor(private wasm: BarretenbergWasm, private worker: BarretenbergWorker = wasm as any) {}

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

  public valueNotePartialCommitment(noteSecret: Buffer, owner: AccountId) {
    this.wasm.transferToHeap(noteSecret, 0);
    this.wasm.transferToHeap(owner.publicKey.toBuffer(), 32);
    // Currently this is only used for creating the value notes from a claim note.
    // Given these notes are owned by the creator of the claim note, we can leave creator pubkey as 0.
    this.wasm.transferToHeap(Buffer.alloc(32), 96);
    this.wasm.call('notes__value_note_partial_commitment', 0, 32, 96, owner.nonce, 0);
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

  public accountNoteCommitment(
    accountAliasId: AccountAliasId,
    publicKey: GrumpkinAddress,
    signingKey: Buffer,
  ) {
    this.wasm.transferToHeap(accountAliasId.toBuffer(), 0);
    this.wasm.transferToHeap(publicKey.toBuffer(), 32);
    this.wasm.transferToHeap(signingKey, 64);
    this.wasm.call('notes__account_note_commitment', 0, 32, 64, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public accountAliasIdNullifier(accountAliasId: AccountAliasId) {
    this.wasm.transferToHeap(accountAliasId.toBuffer(), 0);
    this.wasm.call('notes__compute_account_alias_id_nullifier', 0, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public async batchDecryptNotes(keysBuf: Buffer, privateKey: Buffer) {
    const decryptedNoteLength = 73;
    const numKeys = keysBuf.length / ViewingKey.SIZE;

    const mem = await this.worker.call('bbmalloc', keysBuf.length + privateKey.length);
    await this.worker.transferToHeap(keysBuf, mem);
    await this.worker.transferToHeap(privateKey, mem + keysBuf.length);

    await this.worker.call('notes__batch_decrypt_notes', mem, mem + keysBuf.length, numKeys, mem);
    const dataBuf: Buffer = Buffer.from(await this.worker.sliceMemory(mem, mem + numKeys * decryptedNoteLength));
    await this.worker.call('bbfree', mem);
    return dataBuf;
  }
}
