import Dexie from 'dexie';

export class DbUser {
  constructor(public id: number, public publicKey: Uint8Array, public privateKey?: Uint8Array, public alias?: string) {}
}

export class DbNote {
  constructor(
    public id: number,
    public value: number,
    public viewingKey: Uint8Array,
    public encrypted: Uint8Array,
    public nullifier: Uint8Array,
    public nullified: boolean,
    public owner: number,
  ) {}
}

export interface Database {
  addNote(note: DbNote): Promise<void>;
  getNote(userId: number, nullifier: Uint8Array): Promise<DbNote | undefined>;
  nullifyNote(index: number): Promise<void>;
  getUserNotes(userId: number): Promise<DbNote[]>;
  getUser(userId: number): Promise<DbUser | undefined>;
  getUsers(): Promise<DbUser[]>;
  addUser(user: DbUser): Promise<void>;
}

export class DexieDatabase implements Database {
  private dexie = new Dexie('hummus');
  private user: Dexie.Table<DbUser, number>;
  private note: Dexie.Table<DbNote, number>;

  constructor() {
    this.dexie.version(1).stores({
      user: '++id, publicKey, privateKey',
      note: '++id, value, nullified, owner',
    });

    this.user = this.dexie.table('user');
    this.note = this.dexie.table('note');
    this.user.mapToClass(DbUser);
    this.note.mapToClass(DbNote);
  }

  async addNote(note: DbNote) {
    await this.note.put(note);
  }

  async getNote(userId: number, nullifier: Buffer) {
    return (await this.note.filter(n => nullifier.equals(Buffer.from(n.nullifier)) && n.owner === userId).toArray())[0];
  }

  async nullifyNote(index: number) {
    await this.note.update(index, { nullified: true });
  }

  async getUserNotes(userId: number) {
    return await this.note.filter(n => !n.nullified && n.owner === userId).toArray();
  }

  async getUser(userId: number) {
    return await this.user.get(userId);
  }

  async getUsers() {
    return await this.user.toArray();
  }

  async addUser(user: DbUser) {
    await this.user.put(user);
  }

  async clearNote() {
    this.note.clear();
  }

  async clearUser() {
    this.user.clear();
  }
}
