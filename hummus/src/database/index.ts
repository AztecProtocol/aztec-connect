import Dexie from 'dexie';

const MAX_BYTE_LENGTH = 100000000;

export type UserTxAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'RECEIVE';

export class DbUser {
  constructor(public id: number, public publicKey: Uint8Array, public privateKey?: Uint8Array, public alias?: string) {}
}

export class DbUserTx {
  constructor(
    public txId: string,
    public userId: number,
    public action: UserTxAction,
    public value: number,
    public recipient: Uint8Array,
    public settled: 0 | 1, // boolean is non-indexable
    public created: Date,
    public inputNote1?: number,
    public inputNote2?: number,
    public outputNote1?: Uint8Array,
    public outputNote2?: Uint8Array,
  ) {}
}

export class DbNote {
  constructor(
    public id: number,
    public value: number,
    public viewingKey: Uint8Array,
    public encrypted: Uint8Array,
    public nullifier: Uint8Array,
    public nullified: 0 | 1,
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
  getUserTxs(userId: number): Promise<DbUserTx[]>;
  addUserTx(userTx: DbUserTx): Promise<void>;
  settleUserTx(txId: string): Promise<void>;
  deleteUserTx(txId: string): Promise<void>;
  clearUserTxState(): Promise<void>;
  deleteKey(name: string): Promise<void>;
  addKey(name: string, value: Buffer): Promise<void>;
  getKey(name: string): Promise<Uint8Array | undefined>;
}

const toSubKeyName = (name: string, index: number) => `${name}__${index}`;

export class DexieDatabase implements Database {
  private dexie = new Dexie('hummus');
  private user: Dexie.Table<DbUser, number>;
  private userTx: Dexie.Table<DbUserTx, string>;
  private note: Dexie.Table<DbNote, number>;
  private key: Dexie.Table<DbKey, string>;

  constructor() {
    this.dexie.version(1).stores({
      user: '++id, publicKey',
      user_tx: '&txId, userId, settled, created',
      note: '++id, nullified, owner',
      key: '&name',
    });

    this.user = this.dexie.table('user');
    this.note = this.dexie.table('note');
    this.userTx = this.dexie.table('user_tx');
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
    await this.note.update(index, { nullified: 1 });
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

  async getUserTxs(userId: number) {
    return this.userTx.where({ userId }).reverse().sortBy('created');
  }

  async addUserTx(userTx: DbUserTx) {
    await this.userTx.put(userTx);
  }

  async settleUserTx(txId: string) {
    await this.userTx.where({ txId }).modify({ settled: 1 });
  }

  async deleteUserTx(txId: string) {
    await this.userTx.where({ txId }).delete();
  }

  async clearUserTxState() {
    await this.userTx.where({ settled: 1 }).modify({ settled: 0 });
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

  async addKey(name: string, value: Buffer) {
    const size = value.byteLength;
    if (size <= MAX_BYTE_LENGTH) {
      await this.key.put({ name, value, size });
    } else {
      await this.deleteKey(name);

      const count = Math.ceil(size / MAX_BYTE_LENGTH);
      for (let i = 0; i < count; ++i) {
        const subValue = new Uint8Array(value.buffer.slice(MAX_BYTE_LENGTH * i, MAX_BYTE_LENGTH * (i + 1)));
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
      return undefined;
    }

    if (!key.count) {
      return key.value;
    }

    const subKeyNames = [...Array(key.count)].map((_, i) => toSubKeyName(name, i));
    const subKeys = await this.key.bulkGet(subKeyNames);
    if (subKeys.some(k => !k)) {
      return undefined;
    }

    const value = new Uint8Array(key.size);
    let prevSize = 0;
    for (let i = 0; i < key.count; ++i) {
      value.set(subKeys[i]!.value, prevSize);
      prevSize += subKeys[i]!.value.byteLength;
    }

    return value;
  }
}
