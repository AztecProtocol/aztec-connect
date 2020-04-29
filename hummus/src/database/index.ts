import Dexie from 'dexie';
import { Note as ProofNote } from 'barretenberg-es/client_proofs/note';

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

export class User implements IUser {
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

export class Note implements INote {
  constructor(
    public id: number,
    public value: number,
    public viewingKey: Uint8Array,
    public encrypted: Uint8Array,
    public nullified: boolean,
    public owner: number,
  ) {}

  async toTrackedNote(computeNullifier: (encryptedNote: Buffer, index: number, viewingKey: Buffer) => Buffer): TrackedNote {
    const owner = await db.user.get(this.owner);
    if (!owner) {
      throw Error(`Owner '${this.owner}' not found.`);
    }

    const encryptedNote = Buffer.from(this.encrypted);
    const viewingKeyBuf = Buffer.from(this.viewingKey);
    const note = new ProofNote(Buffer.from(owner.publicKey), viewingKeyBuf, this.value);
    const nullifier = computeNullifier(encryptedNote, this.id, viewingKeyBuf);
    return {
      index: this.id,
      nullifier,
      note,
    };
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
