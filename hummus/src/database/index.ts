import Dexie from 'dexie';
import { Note } from 'barretenberg-es/client_proofs/note';

let db: Database;

interface IUser {
  id: number;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

interface INote {
  id: number;
  value: number;
  viewingKey: Uint8Array;
  encrypted: Uint8Array;
  nullified: boolean;
  owner: number;
}

class Database extends Dexie {
  user: Dexie.Table<IUser, number>;
  note: Dexie.Table<INote, number>;

  constructor() {
    super('hummus');

    this.version(1).stores({
      user: '++id, publicKey, privateKey',
      note: '++id, value, nullified, owner',
    });

    this.user = this.table('user');
    this.note = this.table('note');
    this.user.mapToClass(UserExt);
    this.note.mapToClass(NoteExt);
  }
}

class UserExt {
  constructor(
    private id: number,
    private publicKey: Uint8Array,
    private privateKey: Uint8Array,
  ) {}

  toUser() {
    return {
      id: this.id,
      privateKey: Buffer.from(this.privateKey),
      publicKey: Buffer.from(this.publicKey),
    };
  }
}

class NoteExt {
  constructor(
    private id: number,
    private value: number,
    private viewingKey: Uint8Array,
    private encrypted: Uint8Array,
    private owner: number,
  ) {}

  async toTrackedNote(computeNullifier: (encryptedNote: Buffer, index: number, viewingKey: Buffer) => Buffer) {
    const owner = await db.user.get(this.owner);
    if (!owner) {
      return null;
    }

    const encryptedNote = Buffer.from(this.encrypted);
    const viewingKeyBuf = Buffer.from(this.viewingKey);
    const note = new Note(Buffer.from(owner.publicKey), viewingKeyBuf, this.value);
    const nullifier = computeNullifier(encryptedNote, this.id, viewingKeyBuf);
    return {
      index: this.id,
      nullifier,
      note,
    };
  }
}

db = new Database();

export { db };
