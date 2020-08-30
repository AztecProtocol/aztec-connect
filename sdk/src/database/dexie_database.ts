import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import Dexie from 'dexie';
import { Database, SigningKey } from './database';
import { Note } from '../note';
import { UserData } from '../user';
import { UserTx, UserTxAction } from '../user_tx';

const MAX_BYTE_LENGTH = 100000000;

const toSubKeyName = (name: string, index: number) => `${name}__${index}`;

const toDexieUserTxId = (userTx: UserTx) => `${userTx.txHash.toString('hex')}__${userTx.ethAddress.toString()}`;

class DexieNote {
  constructor(
    public id: number,
    public value: string,
    public dataEntry: Uint8Array,
    public viewingKey: Uint8Array,
    public encrypted: Uint8Array,
    public nullifier: Uint8Array,
    public nullified: 0 | 1,
    public owner: Uint8Array,
  ) {}
}

const noteToDexieNote = (note: Note) =>
  new DexieNote(
    note.index,
    note.value.toString(),
    note.dataEntry,
    note.viewingKey,
    note.encrypted,
    note.nullifier,
    note.nullified ? 1 : 0,
    new Uint8Array(note.owner.toBuffer()),
  );

const dexieNoteToNote = ({
  id,
  value,
  dataEntry,
  viewingKey,
  encrypted,
  nullifier,
  nullified,
  owner,
  ...rest
}: DexieNote): Note => ({
  ...rest,
  index: id,
  value: BigInt(value),
  dataEntry: Buffer.from(dataEntry),
  viewingKey: Buffer.from(viewingKey),
  encrypted: Buffer.from(encrypted),
  nullifier: Buffer.from(nullifier),
  nullified: !!nullified,
  owner: new EthAddress(Buffer.from(owner)),
});

class DexieKey {
  constructor(public name: string, public value: Uint8Array, public size: number, public count?: number) {}
}

class DexieUser {
  constructor(
    public ethAddress: Uint8Array,
    public publicKey: Uint8Array,
    public privateKey: Uint8Array,
    public syncedToBlock: number,
    public syncedToRollup: number,
    public alias?: string,
  ) {}
}

const userToDexieUser = (user: UserData): DexieUser => ({
  ...user,
  ethAddress: new Uint8Array(user.ethAddress.toBuffer()),
  publicKey: new Uint8Array(user.publicKey.toBuffer()),
  privateKey: new Uint8Array(user.privateKey),
});

const dexieUserToUser = (dexieUser: DexieUser): UserData => ({
  ...dexieUser,
  ethAddress: new EthAddress(Buffer.from(dexieUser.ethAddress)),
  publicKey: new GrumpkinAddress(Buffer.from(dexieUser.publicKey)),
  privateKey: Buffer.from(dexieUser.privateKey),
});

class DexieUserTx {
  constructor(
    public id: string,
    public txHash: Uint8Array,
    public ethAddress: Uint8Array,
    public action: UserTxAction,
    public value: string,
    public settled: 0 | 1, // boolean is non-indexable
    public created: Date,
    public recipient?: Uint8Array,
  ) {}
}

const userTxToDexieUserTx = (id: string, userTx: UserTx) =>
  new DexieUserTx(
    id,
    new Uint8Array(userTx.txHash),
    new Uint8Array(userTx.ethAddress.toBuffer()),
    userTx.action,
    userTx.value.toString(),
    userTx.settled ? 1 : 0,
    userTx.created,
    userTx.recipient ? new Uint8Array(userTx.recipient) : undefined,
  );

const dexieUserTxToUserTx = ({ id, txHash, settled, recipient, ...dexieUserTx }: DexieUserTx): UserTx => ({
  ...dexieUserTx,
  txHash: Buffer.from(txHash),
  ethAddress: new EthAddress(Buffer.from(dexieUserTx.ethAddress)),
  value: BigInt(dexieUserTx.value),
  settled: !!settled,
  recipient: recipient ? Buffer.from(recipient) : undefined,
});

class DexieUserKey {
  constructor(public owner: Uint8Array, public key: Uint8Array, public treeIndex: number) {}
}

class DexieAlias {
  constructor(public aliasHash: Uint8Array, public key: Uint8Array) {}
}

export class DexieDatabase implements Database {
  private dexie = new Dexie('hummus');
  private user: Dexie.Table<DexieUser, number>;
  private userKeys: Dexie.Table<DexieUserKey, string>;
  private userTx: Dexie.Table<DexieUserTx, string>;
  private note: Dexie.Table<DexieNote, number>;
  private key: Dexie.Table<DexieKey, string>;
  private alias: Dexie.Table<DexieAlias, number>;

  constructor() {
    this.dexie.version(3).stores({
      user: '&ethAddress',
      user_keys: '&[owner+key], owner',
      user_tx: '&[txHash+ethAddress], txHash, ethAddress, settled, created',
      note: '++id, nullified, owner',
      key: '&name',
      alias: '&aliasHash',
    });

    this.user = this.dexie.table('user');
    this.note = this.dexie.table('note');
    this.userTx = this.dexie.table('user_tx');
    this.userKeys = this.dexie.table('user_keys');
    this.key = this.dexie.table('key');
    this.alias = this.dexie.table('alias');
    this.user.mapToClass(DexieUser);
    this.note.mapToClass(DexieNote);
    this.userTx.mapToClass(DexieUserTx);
    this.userKeys.mapToClass(DexieUserKey);
    this.key.mapToClass(DexieKey);
    this.alias.mapToClass(DexieAlias);
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

  async getNoteByNullifier(ethAddress: EthAddress, nullifier: Buffer) {
    const ethAddressBuf = ethAddress.toBuffer();
    const note = (
      await this.note
        .filter(n => nullifier.equals(Buffer.from(n.nullifier)) && Buffer.from(n.owner).equals(ethAddressBuf))
        .toArray()
    )[0];
    return note ? dexieNoteToNote(note) : undefined;
  }

  async nullifyNote(index: number) {
    await this.note.update(index, { nullified: 1 });
  }

  async getUserNotes(ethAddress: EthAddress) {
    const ethAddressBuf = ethAddress.toBuffer();
    return (await this.note.filter(n => !n.nullified && Buffer.from(n.owner).equals(ethAddressBuf)).toArray()).map(
      dexieNoteToNote,
    );
  }

  async getUser(ethAddress: EthAddress) {
    const user = await this.user.get(new Uint8Array(ethAddress.toBuffer()));
    return user ? dexieUserToUser(user) : undefined;
  }

  async getUsers() {
    return (await this.user.toArray()).map(dexieUserToUser);
  }

  async addUser(user: UserData) {
    await this.user.put(userToDexieUser(user));
  }

  async updateUser(user: UserData) {
    await this.user.where({ ethAddress: new Uint8Array(user.ethAddress.toBuffer()) }).modify(userToDexieUser(user));
  }

  async getUserTx(ethAddress: EthAddress, txHash: Buffer) {
    const userTx = await this.userTx.get({
      ethAddress: new Uint8Array(ethAddress.toBuffer()),
      txHash: new Uint8Array(txHash),
    });
    return userTx ? dexieUserTxToUserTx(userTx) : undefined;
  }

  async getUserTxs(ethAddress: EthAddress) {
    return (
      await this.userTx
        .where({ ethAddress: new Uint8Array(ethAddress.toBuffer()) })
        .reverse()
        .sortBy('created')
    ).map(dexieUserTxToUserTx);
  }

  async addUserTx(userTx: UserTx) {
    const id = toDexieUserTxId(userTx);
    await this.userTx.put(userTxToDexieUserTx(id, userTx));
  }

  async settleUserTx(ethAddress: EthAddress, txHash: Buffer) {
    await this.userTx
      .where({ ethAddress: new Uint8Array(ethAddress.toBuffer()), txHash: new Uint8Array(txHash) })
      .modify({ settled: 1 });
  }

  async deleteUserTx(ethAddress: EthAddress, txHash: Buffer) {
    await this.userTx
      .where({ ethAddress: new Uint8Array(ethAddress.toBuffer()), txHash: new Uint8Array(txHash) })
      .delete();
  }

  async clearUserTxState() {
    await this.userTx.where({ settled: 1 }).modify({ settled: 0 });
  }

  async removeUser(ethAddress: EthAddress) {
    const address = new Uint8Array(ethAddress.toBuffer());
    await this.userTx.where({ ethAddress: address }).delete();
    await this.note.where({ owner: address }).delete();
    await this.user.where({ ethAddress: address }).delete();
  }

  async resetUsers() {
    await this.note.clear();
    await this.userTx.clear();
    await this.user.toCollection().modify({ syncedToBlock: -1, syncedToRollup: -1 });
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

  async getUserSigningKeys(owner: EthAddress) {
    const userKeys = await this.userKeys.where({ owner: new Uint8Array(owner.toBuffer()) }).toArray();
    return userKeys.map(uk => ({ ...uk, owner: new EthAddress(Buffer.from(uk.owner)), key: Buffer.from(uk.key) }));
  }

  async addUserSigningKey({ owner, key, treeIndex }: SigningKey) {
    this.userKeys.add({ owner: new Uint8Array(owner.toBuffer()), key: new Uint8Array(key), treeIndex });
  }

  async removeUserSigningKey({ owner, key }: SigningKey) {
    this.userKeys.where({ owner: new Uint8Array(owner.toBuffer()), key: new Uint8Array(key) }).delete();
  }

  async addAlias(aliasHash: Buffer, address: GrumpkinAddress) {
    this.alias.add({ aliasHash: new Uint8Array(aliasHash), key: new Uint8Array(address.toBuffer()) });
  }

  async getAliasAddress(aliasHash: Buffer) {
    const alias = await this.alias.get(new Uint8Array(aliasHash));
    return alias ? new GrumpkinAddress(Buffer.from(alias.key)) : undefined;
  }
}
