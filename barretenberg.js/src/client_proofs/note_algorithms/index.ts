import { toBigIntBE } from 'bigint-buffer';
import { GrumpkinAddress } from '../../address';
import { ViewingKey } from '../../viewing_key';
import { BarretenbergWasm } from '../../wasm';
import { BarretenbergWorker } from '../../wasm/worker';

export class NoteAlgorithms {
  constructor(private wasm: BarretenbergWasm, private worker: BarretenbergWorker = wasm as any) {}

  public computeNoteNullifier(encryptedNote: Buffer, index: number, accountPrivateKey: Buffer, real = true) {
    this.wasm.transferToHeap(encryptedNote, 0);
    this.wasm.transferToHeap(accountPrivateKey, 64);
    this.wasm.call('notes__compute_nullifier', 0, 64, index, real, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public computeNoteNullifierBigInt(encryptedNote: Buffer, index: number, accountPrivateKey: Buffer, real = true) {
    return toBigIntBE(this.computeNoteNullifier(encryptedNote, index, accountPrivateKey, real));
  }

  public encryptNote(noteBuf: Buffer) {
    const mem = this.wasm.call('bbmalloc', noteBuf.length);
    this.wasm.transferToHeap(noteBuf, mem);
    this.wasm.call('notes__encrypt_note', mem, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 64));
  }

  public encryptClaimNote(noteBuf: Buffer, publicKey: GrumpkinAddress, nonce: number) {
    const mem = this.wasm.call('bbmalloc', noteBuf.length + 64);
    this.wasm.transferToHeap(noteBuf, mem);
    this.wasm.transferToHeap(publicKey.toBuffer(), mem + noteBuf.length);
    this.wasm.call('notes__encrypt_claim_note', mem, mem + noteBuf.length, nonce, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 64));
  }

  public computeClaimNoteNullifier(encryptedNote: Buffer, index: number) {
    this.wasm.transferToHeap(encryptedNote, 0);
    this.wasm.call('notes__compute_claim_note_nullifier', 0, index, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public async batchDecryptNotes(keysBuf: Buffer, privateKey: Buffer) {
    const decryptedNoteLength = 41;
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
