import Dexie from 'dexie';

const MAX_BYTE_LENGTH = 130000000;

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

export class DbKey {
  constructor(public name: string, public value: Uint8Array, public size: number, public count?: number) {}
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

const toSubKeyName = (name: string, index: number) => `${name}__${index}`;

export class DexieDatabase implements Database {
  private dexie = new Dexie('hummus');
  private user: Dexie.Table<DbUser, number>;
  private note: Dexie.Table<DbNote, number>;
  private key: Dexie.Table<DbKey, string>;

  constructor() {
    this.dexie.version(1).stores({
      user: '++id, publicKey',
      note: '++id, value, nullified, owner',
      key: '&name',
    });

    this.user = this.dexie.table('user');
    this.note = this.dexie.table('note');
    this.key = this.dexie.table('key');
    this.user.mapToClass(DbUser);
    this.note.mapToClass(DbNote);
    this.key.mapToClass(DbKey);
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
    await this.note.clear();
  }

  async clearUser() {
    await this.user.clear();
  }

  async deleteKey(name: string) {
    const key = await this.key.get(name);
    if (!key) {
      return;
    }

    for (let i = 0; i < key.count!; ++i) {
      await this.key.where({ name: toSubKeyName(name, i) }).delete();
    }
    await this.key.where({ name }).delete();
  }

  async addKey(name: string, value: Buffer | Uint8Array) {
    const size = value.byteLength;
    if (size <= MAX_BYTE_LENGTH) {
      await this.key.put({ name, value, size });
    } else {
      await this.deleteKey(name);

      const count = Math.ceil(size / MAX_BYTE_LENGTH);
      for (let i = 0; i < count; ++i) {
        const subValue = value.slice(MAX_BYTE_LENGTH * i, MAX_BYTE_LENGTH * (i + 1));
        await this.key.add({
          name: toSubKeyName(name, i),
          value: subValue,
          size: subValue.byteLength,
        });
      }
      await this.key.add({ name, value: new Uint8Array(), size, count });
    }
  }

  async getKey(name: string) {
    const key = await this.key.get(name);
    if (!key || !key.size) {
      return null;
    }

    if (!key.count) {
      return key.value;
    }

    const value = new Uint8Array(key.size);
    let prevSize = 0;
    for (let i = 0; i < key.count; ++i) {
      const subKey = await this.key.get(toSubKeyName(name, i));
      if (!subKey) {
        return null;
      }
      value.set(subKey.value, prevSize);
      prevSize += subKey.value.byteLength;
    }

    return value;
  }
}
