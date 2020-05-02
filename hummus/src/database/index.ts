import Dexie from 'dexie';
import { Note as ProofNote } from 'barretenberg-es/client_proofs/note';
import { TrackedNote } from '../note_picker';

let db: Database;

export class User {
  constructor(
    public id: number,
    public publicKey: Uint8Array,
    public privateKey: Uint8Array,
  ) {}

  toUser() {
    return {
      id: this.id,
      privateKey: Buffer.from(this.privateKey),
      publicKey: Buffer.from(this.publicKey),
    };
  }
}

export class Note {
  constructor(
    public id: number,
    public value: number,
    public viewingKey: Uint8Array,
    public encrypted: Uint8Array,
    public nullified: boolean,
    public owner: number,
  ) {}

  async toTrackedNote(computeNullifier: (encryptedNote: Buffer, index: number, viewingKey: Buffer) => Buffer) {
    const owner = await db.user.get(this.owner);
    if (!owner) {
      throw Error(`Owner '${this.owner}' not found.`);
    }

    const encryptedNote = Buffer.from(this.encrypted);
    const viewingKeyBuf = Buffer.from(this.viewingKey);
    const note = new ProofNote(Buffer.from(owner.publicKey), viewingKeyBuf, this.value);
    const nullifier = computeNullifier(encryptedNote, this.id, viewingKeyBuf);
    const trackedNote: TrackedNote = {
      index: this.id,
      nullifier,
      note,
    };
    return trackedNote;
  }
}

class Database extends Dexie {
  user: Dexie.Table<User, number>;
  note: Dexie.Table<Note, number>;

  constructor() {
    super('hummus');

    this.version(1).stores({
      user: '++id, publicKey, privateKey',
      note: '++id, value, nullified, owner',
    });

    this.user = this.table('user');
    this.note = this.table('note');
    this.user.mapToClass(User);
    this.note.mapToClass(Note);
  }
}

db = new Database();

export { db };
