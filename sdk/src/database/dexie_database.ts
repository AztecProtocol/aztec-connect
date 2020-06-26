import { Database, DbUser, DbUserTx, DbNote, DbKey } from './database';
import Dexie from 'dexie';

const MAX_BYTE_LENGTH = 100000000;

const toSubKeyName = (name: string, index: number) => `${name}__${index}`;

export class DexieDatabase implements Database {
  private dexie = new Dexie('hummus');
  private user: Dexie.Table<DbUser, number>;
  private userTx: Dexie.Table<DbUserTx, string>;
  private note: Dexie.Table<DbNote, number>;
  private key: Dexie.Table<DbKey, string>;

  constructor() {
    this.dexie.version(2).stores({
      user: '++id, publicKey',
      user_tx: '&txHash, userId, settled, created',
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

  close() {
    this.dexie.close();
  }

  async addNote(note: DbNote) {
    await this.note.put(note);
  }

  async getNote(treeIndex: number) {
    return await this.note.get(treeIndex);
  }

  async getNoteByNullifier(userId: number, nullifier: Buffer) {
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

  async settleUserTx(txHash: Uint8Array) {
    await this.userTx.where({ txHash }).modify({ settled: 1 });
  }

  async deleteUserTx(txHash: Uint8Array) {
    await this.userTx.where({ txHash }).delete();
  }

  async clearUserTxState() {
    // await this.userTx.where({ settled: 1 }).modify({ settled: 0 });
    await this.userTx.clear();
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
