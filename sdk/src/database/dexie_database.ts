import Dexie from 'dexie';
import { Database } from './database';
import { Note } from '../note';
import { User } from '../user';
import { UserTx, UserTxAction } from '../user_tx';

const MAX_BYTE_LENGTH = 100000000;

const toSubKeyName = (name: string, index: number) => `${name}__${index}`;

const toDexieUserTxId = (userTx: UserTx) => `${userTx.txHash.toString('hex')}__${userTx.userId}`;

class DexieNote {
  constructor(
    public id: number,
    public value: number,
    public dataEntry: Uint8Array,
    public viewingKey: Uint8Array,
    public encrypted: Uint8Array,
    public nullifier: Uint8Array,
    public nullified: 0 | 1,
    public owner: number,
  ) {}
}

const noteToDexieNote = (note: Note) =>
  new DexieNote(
    note.index,
    note.value,
    note.dataEntry,
    note.viewingKey,
    note.encrypted,
    note.nullifier,
    note.nullified ? 1 : 0,
    note.owner,
  );

const dexieNoteToNote = ({ id, dataEntry, viewingKey, encrypted, nullifier, nullified, ...rest }: DexieNote): Note => ({
  ...rest,
  index: id,
  dataEntry: Buffer.from(dataEntry),
  viewingKey: Buffer.from(viewingKey),
  encrypted: Buffer.from(encrypted),
  nullifier: Buffer.from(nullifier),
  nullified: !!nullified,
});

class DexieKey {
  constructor(public name: string, public value: Uint8Array, public size: number, public count?: number) {}
}

class DexieUser {
  constructor(public id: number, public publicKey: Uint8Array, public privateKey?: Uint8Array, public alias?: string) {}
}

const dexieUserToUser = (dexieUser: DexieUser): User => ({
  ...dexieUser,
  publicKey: Buffer.from(dexieUser.publicKey),
  privateKey: dexieUser.privateKey ? Buffer.from(dexieUser.privateKey) : undefined,
});

class DexieUserTx {
  constructor(
    public id: string,
    public txHash: Uint8Array,
    public userId: number,
    public action: UserTxAction,
    public value: number,
    public settled: 0 | 1, // boolean is non-indexable
    public created: Date,
    public recipient?: Uint8Array,
  ) {}
}

const userTxToDexieUserTx = (id: string, userTx: UserTx) =>
  new DexieUserTx(
    id,
    new Uint8Array(userTx.txHash),
    userTx.userId,
    userTx.action,
    userTx.value,
    userTx.settled ? 1 : 0,
    userTx.created,
    userTx.recipient ? new Uint8Array(userTx.recipient) : undefined,
  );

const dexieUserTxToUserTx = ({ id, txHash, settled, recipient, ...dexieUserTx }: DexieUserTx): UserTx => ({
  ...dexieUserTx,
  txHash: Buffer.from(txHash),
  settled: !!settled,
  recipient: recipient ? Buffer.from(recipient) : undefined,
});

export class DexieDatabase implements Database {
  private dexie = new Dexie('hummus');
  private user: Dexie.Table<DexieUser, number>;
  private userTx: Dexie.Table<DexieUserTx, string>;
  private note: Dexie.Table<DexieNote, number>;
  private key: Dexie.Table<DexieKey, string>;

  constructor() {
    this.dexie.version(3).stores({
      user: '++id, publicKey',
      user_tx: '&id, [txHash+userId], userId, settled, created',
      note: '++id, nullified, owner',
      key: '&name',
    });

    this.user = this.dexie.table('user');
    this.note = this.dexie.table('note');
    this.userTx = this.dexie.table('user_tx');
    this.key = this.dexie.table('key');
    this.user.mapToClass(DexieUser);
    this.userTx.mapToClass(DexieUserTx);
    this.note.mapToClass(DexieNote);
    this.key.mapToClass(DexieKey);
  }

  close() {
    this.dexie.close();
  }

  async addNote(note: Note) {
    await this.note.put(noteToDexieNote(note));
  }

  async getNote(treeIndex: number) {
    const note = await this.note.get(treeIndex);
    return note ? dexieNoteToNote(note) : undefined;
  }

  async getNoteByNullifier(userId: number, nullifier: Buffer) {
    const note = (
      await this.note.filter(n => nullifier.equals(Buffer.from(n.nullifier)) && n.owner === userId).toArray()
    )[0];
    return note ? dexieNoteToNote(note) : undefined;
  }

  async nullifyNote(index: number) {
    await this.note.update(index, { nullified: 1 });
  }

  async getUserNotes(userId: number) {
    return (await this.note.filter(n => !n.nullified && n.owner === userId).toArray()).map(dexieNoteToNote);
  }

  async getUser(userId: number) {
    const user = await this.user.get(userId);
    return user ? dexieUserToUser(user) : undefined;
  }

  async getUsers() {
    return (await this.user.toArray()).map(dexieUserToUser);
  }

  async addUser(user: User) {
    await this.user.put(user);
  }

  async getUserTx(userId: number, txHash: Buffer) {
    const userTx = await this.userTx.get({ userId, txHash: new Uint8Array(txHash) });
    return userTx ? dexieUserTxToUserTx(userTx) : undefined;
  }

  async getUserTxs(userId: number) {
    return (await this.userTx.where({ userId }).reverse().sortBy('created')).map(dexieUserTxToUserTx);
  }

  async addUserTx(userTx: UserTx) {
    const id = toDexieUserTxId(userTx);
    await this.userTx.put(userTxToDexieUserTx(id, userTx));
  }

  async settleUserTx(txHash: Buffer) {
    await this.userTx.where({ txHash: new Uint8Array(txHash) }).modify({ settled: 1 });
  }

  async deleteUserTx(txHash: Buffer) {
    await this.userTx.where({ txHash: new Uint8Array(txHash) }).delete();
  }

  async clearUserTxState() {
    await this.userTx.where({ settled: 1 }).modify({ settled: 0 });
  }

  async clearUserTx() {
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
