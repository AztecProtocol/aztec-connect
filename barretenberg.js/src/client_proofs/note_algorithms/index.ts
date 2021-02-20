import { toBigIntBE } from 'bigint-buffer';
import { TreeNote } from '../note';
import { BarretenbergWasm } from '../../wasm';
import { ViewingKey } from '../../viewing_key';
import { Grumpkin } from '../../ecc/grumpkin';
import { GrumpkinAddress } from '../../address';
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

  public encryptNote(note: TreeNote) {
    const noteBuf = note.toBuffer();
    const mem = this.wasm.call('bbmalloc', noteBuf.length);
    this.wasm.transferToHeap(noteBuf, mem);
    this.wasm.call('notes__encrypt_note', mem, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 64));
  }

  public async batchDecryptNotes(keysBuf: Buffer, privateKey: Buffer, grumpkin: Grumpkin) {
    const decryptedNoteLength = 41;
    const numKeys = keysBuf.length / ViewingKey.SIZE;

    const mem = await this.worker.call('bbmalloc', keysBuf.length + privateKey.length);
    await this.worker.transferToHeap(keysBuf, mem);
    await this.worker.transferToHeap(privateKey, mem + keysBuf.length);

    await this.worker.call('notes__batch_decrypt_notes', mem, mem + keysBuf.length, numKeys, mem);
    const dataBuf: Buffer = Buffer.from(await this.worker.sliceMemory(mem, mem + numKeys * decryptedNoteLength));
    const ownerPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));

    const notes: (TreeNote | undefined)[] = [];
    for (let i = 0; i < numKeys; ++i) {
      const noteBuf = dataBuf.slice(i * decryptedNoteLength, i * decryptedNoteLength + 41);
      if (noteBuf[0] == 1) {
        const note = TreeNote.createFromEphPub(
          ownerPubKey,
          toBigIntBE(noteBuf.slice(1, 33)),
          noteBuf.readUInt32BE(33),
          noteBuf.readUInt32BE(37),
          new GrumpkinAddress(keysBuf.slice((i + 1) * ViewingKey.SIZE - 64, (i + 1) * ViewingKey.SIZE)), // ephPubKey,
          privateKey,
          grumpkin,
        );
        notes.push(note);
      } else {
        notes.push(undefined);
      }
    }
    await this.worker.call('bbfree', mem);
    return notes;
  }
}
