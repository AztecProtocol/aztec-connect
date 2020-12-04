import { toBigIntBE } from 'bigint-buffer';
import { Note } from '../note';
import { Signature } from '../signature';
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
    this.wasm.transferToHeap(note.toBuffer(), 0);
    this.wasm.call('notes__encrypt_note', 0, 100);
    return Buffer.from(this.wasm.sliceMemory(100, 164));
  }

  public decryptNote(encryptedNote: Buffer, privateKey: Buffer, viewingKey: Buffer) {
    this.wasm.transferToHeap(encryptedNote, 0);
    this.wasm.transferToHeap(privateKey, 64);
    this.wasm.transferToHeap(viewingKey, 96);
    const success = this.wasm.call('notes__decrypt_note', 0, 64, 96, 196) ? true : false;
    const value = toBigIntBE(Buffer.from(this.wasm.sliceMemory(196, 228)));
    return { success, value };
  }
}
