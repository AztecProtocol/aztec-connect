import { ViewingKey, ViewingKeyData } from '../../viewing_key/index.js';
import { BarretenbergWasm, BarretenbergWorker } from '../../wasm/index.js';
import { NoteDecryptor } from './note_decryptor.js';

export class SingleNoteDecryptor implements NoteDecryptor {
  constructor(private worker: BarretenbergWasm | BarretenbergWorker) {}

  public async batchDecryptNotes(keysBuf: Buffer, privateKey: Buffer) {
    const numKeys = keysBuf.length / ViewingKey.SIZE;

    const mem = await this.worker.call('bbmalloc', keysBuf.length + privateKey.length);
    await this.worker.transferToHeap(keysBuf, mem);
    await this.worker.transferToHeap(privateKey, mem + keysBuf.length);

    await this.worker.call('notes__batch_decrypt_notes', mem, mem + keysBuf.length, numKeys, mem);
    const dataBuf = Buffer.from(await this.worker.sliceMemory(mem, mem + numKeys * ViewingKeyData.DECRYPTED_SIZE));
    await this.worker.call('bbfree', mem);
    return dataBuf;
  }
}
