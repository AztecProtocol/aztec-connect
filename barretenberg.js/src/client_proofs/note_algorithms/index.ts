import { toBigIntBE } from 'bigint-buffer';
import { Note } from '../note';
import { BarretenbergWasm } from '../../wasm';

export class NoteAlgorithms {
  constructor(private wasm: BarretenbergWasm) {}

  public computeNoteNullifier(encryptedNote: Buffer, index: number, accountPrivateKey: Buffer, real = true) {
    this.wasm.transferToHeap(encryptedNote, 0);
    this.wasm.transferToHeap(accountPrivateKey, 64);
    this.wasm.call('notes__compute_nullifier', 0, 64, index, real, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public computeNoteNullifierBigInt(encryptedNote: Buffer, index: number, accountPrivateKey: Buffer, real = true) {
    return toBigIntBE(this.computeNoteNullifier(encryptedNote, index, accountPrivateKey, real));
  }

  public encryptNote(note: Note) {
    const noteBuf = note.toBuffer();
    const mem = this.wasm.call('bbmalloc', noteBuf.length);
    this.wasm.transferToHeap(noteBuf, mem);
    this.wasm.call('notes__encrypt_note', mem, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 64));
  }
}
