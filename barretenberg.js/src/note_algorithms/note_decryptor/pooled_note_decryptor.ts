import { ViewingKey } from '../../viewing_key';
import { WorkerPool } from '../../wasm';
import { NoteDecryptor } from './note_decryptor';
import { SingleNoteDecryptor } from './single_note_decryptor';

export class PooledNoteDecryptor implements NoteDecryptor {
  private pool: SingleNoteDecryptor[] = [];

  constructor(workerPool: WorkerPool) {
    this.pool = workerPool.workers.map(w => new SingleNoteDecryptor(w));
  }

  public async batchDecryptNotes(keysBuf: Buffer, privateKey: Buffer) {
    const numKeys = keysBuf.length / ViewingKey.SIZE;
    const numKeysPerBatch = Math.max(1, Math.floor(numKeys / this.pool.length));
    const numBatches = Math.min(Math.ceil(numKeys / numKeysPerBatch), this.pool.length);
    const remainingKeys = numKeys - numKeysPerBatch * numBatches;
    let dataStart = 0;
    const batches = [...Array(numBatches)].map((_, i) => {
      const dataEnd = dataStart + (numKeysPerBatch + +(i < remainingKeys)) * ViewingKey.SIZE;
      const keys = keysBuf.slice(dataStart, dataEnd);
      dataStart = dataEnd;
      return keys;
    });
    const results = await Promise.all(batches.map((batch, i) => this.pool[i].batchDecryptNotes(batch, privateKey)));
    return Buffer.concat(results);
  }
}
