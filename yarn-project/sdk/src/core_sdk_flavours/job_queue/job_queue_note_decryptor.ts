import { NoteDecryptor } from '@aztec/barretenberg/note_algorithms';
import { JobQueueTarget } from './job.js';
import { JobQueue } from './job_queue.js';

export class JobQueueNoteDecryptor implements NoteDecryptor {
  private readonly target = JobQueueTarget.NOTE_DECRYPTOR;

  constructor(private queue: JobQueue) {}

  async batchDecryptNotes(keysBuf: Buffer, privateKey: Buffer) {
    const result = await this.queue.createJob(this.target, 'batchDecryptNotes', [
      new Uint8Array(keysBuf),
      new Uint8Array(privateKey),
    ]);
    return Buffer.from(result);
  }
}

export class JobQueueNoteDecryptorClient {
  constructor(private noteDecryptor: NoteDecryptor) {}

  async batchDecryptNotes(keysBuf: Uint8Array, privateKey: Uint8Array) {
    const result = await this.noteDecryptor.batchDecryptNotes(Buffer.from(keysBuf), Buffer.from(privateKey));
    return new Uint8Array(result);
  }
}
