import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/rollup_provider';
import Dexie from 'dexie';
import { Note } from '../note';
import { AccountAliasId, UserData, AccountId } from '../user';
import { UserTx, UserTxAction } from '../user_tx';
import { Alias, Database, SigningKey } from './database';

const MAX_BYTE_LENGTH = 100000000;

const toSubKeyName = (name: string, index: number) => `${name}__${index}`;

const toDexieUserTxId = (userTx: UserTx) => `${userTx.txHash.toString()}__${userTx.userId.toString()}`;

class DexieNote {
  constructor(
    public id: number,
    public assetId: number,
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
    note.assetId,
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
  owner: AccountId.fromBuffer(Buffer.from(owner)),
});

class DexieKey {
  constructor(public name: string, public value: Uint8Array, public size: number, public count?: number) {}
}

class DexieUser {
  constructor(
    public id: Uint8Array,
    public publicKey: Uint8Array,
    public privateKey: Uint8Array,
    public nonce: number,
    public syncedToRollup: number,
    public aliasHash?: Uint8Array,
  ) {}
}

const userToDexieUser = ({ id, publicKey, privateKey, nonce, aliasHash, syncedToRollup }: UserData) =>
  new DexieUser(
    new Uint8Array(id.toBuffer()),
    new Uint8Array(publicKey.toBuffer()),
    new Uint8Array(privateKey),
    nonce,
    syncedToRollup,
    aliasHash ? new Uint8Array(aliasHash.toBuffer()) : undefined,
  );

const dexieUserToUser = ({ id, publicKey, privateKey, aliasHash, ...rest }: DexieUser): UserData => ({
  ...rest,
  id: AccountId.fromBuffer(Buffer.from(id)),
  publicKey: new GrumpkinAddress(Buffer.from(publicKey)),
  privateKey: Buffer.from(privateKey),
  aliasHash: aliasHash ? new AliasHash(Buffer.from(aliasHash)) : undefined,
});

class DexieUserTx {
  constructor(
    public id: string,
    public txHash: Uint8Array,
    public userId: Uint8Array,
    public action: UserTxAction,
    public assetId: number,
    public value: string,
    public settled: 0 | 1, // boolean is non-indexable
    public created: Date,
    public recipient?: Uint8Array,
  ) {}
}

const userTxToDexieUserTx = (id: string, userTx: UserTx) =>
  new DexieUserTx(
    id,
    new Uint8Array(userTx.txHash.toBuffer()),
    new Uint8Array(userTx.userId.toBuffer()),
    userTx.action,
    userTx.assetId,
    userTx.value.toString(),
    userTx.settled ? 1 : 0,
    userTx.created,
    userTx.recipient ? new Uint8Array(userTx.recipient) : undefined,
  );

const dexieUserTxToUserTx = ({
  /* eslint-disable @typescript-eslint/no-unused-vars */
  id,
  /* eslint-enable */
  txHash,
  settled,
  recipient,
  ...dexieUserTx
}: DexieUserTx): UserTx => ({
  ...dexieUserTx,
  txHash: new TxHash(Buffer.from(txHash)),
  userId: AccountId.fromBuffer(Buffer.from(dexieUserTx.userId)),
  value: BigInt(dexieUserTx.value),
  settled: !!settled,
  recipient: recipient ? Buffer.from(recipient) : undefined,
});

class DexieUserKey {
  constructor(
    public accountAliasId: Uint8Array,
    public address: Uint8Array,
    public key: Uint8Array,
    public treeIndex: number,
  ) {}
}

const dexieUserKeyToSigningKey = (userKey: DexieUserKey): SigningKey => ({
  ...userKey,
  accountAliasId: AccountAliasId.fromBuffer(Buffer.from(userKey.accountAliasId)),
  key: Buffer.from(userKey.key),
  address: new GrumpkinAddress(Buffer.from(userKey.address)),
});

class DexieAlias {
  constructor(public aliasHash: Uint8Array, public address: Uint8Array, public latestNonce: number) {}
}

const dexieAliasToAlias = ({ aliasHash, address, latestNonce }: DexieAlias): Alias => ({
  aliasHash: new AliasHash(Buffer.from(aliasHash)),
  address: new GrumpkinAddress(Buffer.from(address)),
  latestNonce,
});

export class DexieDatabase implements Database {
  private dexie!: Dexie;
  private user!: Dexie.Table<DexieUser, number>;
  private userKeys!: Dexie.Table<DexieUserKey, string>;
  private userTx!: Dexie.Table<DexieUserTx, string>;
  private note!: Dexie.Table<DexieNote, number>;
  private key!: Dexie.Table<DexieKey, string>;
  private alias!: Dexie.Table<DexieAlias, number>;

  constructor(private dbName = 'hummus', private version = 5) {}

  async init() {
    this.createTables();

    try {
      // Try to do something with indexedDB.
      // If it fails (with UpgradeError), then the schema has changed significantly that we need to recreate the entire db.
      await this.getUsers();
    } catch (e) {
      await this.dexie.delete();
      this.createTables();
    }
  }

  private createTables() {
    this.dexie = new Dexie(this.dbName);
    this.dexie.version(this.version).stores({
      user: '&id, privateKey',
      userKeys: '&[accountAliasId+key], accountAliasId, address',
      userTx: '&[txHash+userId], txHash, userId, settled, created',
      note: '++id, [owner+nullified], nullifier, owner',
      key: '&name',
      alias: '&[aliasHash+address], aliasHash, address, latestNonce',
    });

    this.user = this.dexie.table('user');
    this.note = this.dexie.table('note');
    this.userTx = this.dexie.table('userTx');
    this.userKeys = this.dexie.table('userKeys');
    this.key = this.dexie.table('key');
    this.alias = this.dexie.table('alias');
    this.user.mapToClass(DexieUser);
    this.note.mapToClass(DexieNote);
    this.userTx.mapToClass(DexieUserTx);
    this.userKeys.mapToClass(DexieUserKey);
    this.key.mapToClass(DexieKey);
    this.alias.mapToClass(DexieAlias);
  }

  async close() {
    await this.dexie.close();
  }

  async clear() {
    for (const table of this.dexie.tables) {
      await table.clear();
    }
  }

  async addNote(note: Note) {
    await this.note.put(noteToDexieNote(note));
  }

  async getNote(treeIndex: number) {
    const note = await this.note.get(treeIndex);
    return note ? dexieNoteToNote(note) : undefined;
  }

  async getNoteByNullifier(nullifier: Buffer) {
    const note = await this.note.get({ nullifier: new Uint8Array(nullifier) });
    return note ? dexieNoteToNote(note) : undefined;
  }

  async nullifyNote(index: number) {
    await this.note.update(index, { nullified: 1 });
  }

  async getUserNotes(userId: AccountId) {
    return (await this.note.where({ owner: new Uint8Array(userId.toBuffer()), nullified: 0 }).toArray()).map(
      dexieNoteToNote,
    );
  }

  async getUser(userId: AccountId) {
    const user = await this.user.get(new Uint8Array(userId.toBuffer()));
    return user ? dexieUserToUser(user) : undefined;
  }

  async getUsers() {
    return (await this.user.toArray()).map(dexieUserToUser);
  }

  async addUser(user: UserData) {
    await this.user.put(userToDexieUser(user));
  }

  async updateUser(user: UserData) {
    await this.user.where({ id: new Uint8Array(user.id.toBuffer()) }).modify(userToDexieUser(user));
  }

  async getUserTx(userId: AccountId, txHash: TxHash) {
    const userTx = await this.userTx.get({
      userId: new Uint8Array(userId.toBuffer()),
      txHash: new Uint8Array(txHash.toBuffer()),
    });
    return userTx ? dexieUserTxToUserTx(userTx) : undefined;
  }

  async getUserTxs(userId: AccountId) {
    return (
      await this.userTx
        .where({ userId: new Uint8Array(userId.toBuffer()) })
        .reverse()
        .sortBy('created')
    ).map(dexieUserTxToUserTx);
  }

  async getUserTxsByTxHash(txHash: TxHash) {
    return (await this.userTx.where({ txHash: new Uint8Array(txHash.toBuffer()) }).toArray()).map(dexieUserTxToUserTx);
  }

  async addUserTx(userTx: UserTx) {
    const id = toDexieUserTxId(userTx);
    await this.userTx.put(userTxToDexieUserTx(id, userTx));
  }

  async settleUserTx(userId: AccountId, txHash: TxHash) {
    await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()), txHash: new Uint8Array(txHash.toBuffer()) })
      .modify({ settled: 1 });
  }

  async removeUser(userId: AccountId) {
    const user = await this.getUser(userId);
    if (!user) return;

    const publicKey = new Uint8Array(user.publicKey.toBuffer());
    await this.userKeys.where({ address: publicKey }).delete();

    const id = new Uint8Array(userId.toBuffer());
    await this.userTx.where({ userId: id }).delete();
    await this.note.where({ owner: id }).delete();
    await this.user.where({ id }).delete();
  }

  async resetUsers() {
    await this.note.clear();
    await this.userTx.clear();
    await this.userKeys.clear();
    await this.alias.clear();
    await this.user.toCollection().modify({ syncedToRollup: -1 });
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
      return Buffer.from(key.value);
    }

    const subKeyNames = [...Array(key.count)].map((_, i) => toSubKeyName(name, i));
    const subKeys = await this.key.bulkGet(subKeyNames);
    if (subKeys.some(k => !k)) {
      return undefined;
    }

    const value = Buffer.alloc(key.size);
    let prevSize = 0;
    for (let i = 0; i < key.count; ++i) {
      value.set(subKeys[i]!.value, prevSize);
      prevSize += subKeys[i]!.value.byteLength;
    }

    return value;
  }

  async addUserSigningKey({ accountAliasId, address, key, treeIndex }: SigningKey) {
    await this.userKeys.add(
      new DexieUserKey(
        new Uint8Array(accountAliasId.toBuffer()),
        new Uint8Array(address.toBuffer()),
        new Uint8Array(key),
        treeIndex,
      ),
    );
  }

  async getUserSigningKeys(accountAliasId: AccountAliasId) {
    const userKeys = await this.userKeys.where({ accountAliasId: new Uint8Array(accountAliasId.toBuffer()) }).toArray();
    return userKeys.map(dexieUserKeyToSigningKey);
  }

  async getUserSigningKeyIndex(accountAliasId: AccountAliasId, signingKey: GrumpkinAddress) {
    const userKey = await this.userKeys.get({
      accountAliasId: new Uint8Array(accountAliasId.toBuffer()),
      key: new Uint8Array(signingKey.toBuffer().slice(0, 32)),
    });
    return userKey ? userKey.treeIndex : undefined;
  }

  async removeUserSigningKeys(accountAliasId: AccountAliasId) {
    await this.userKeys.where({ accountAliasId: new Uint8Array(accountAliasId.toBuffer()) }).delete();
  }

  async addAlias({ aliasHash, address, latestNonce }: Alias) {
    await this.alias.add(
      new DexieAlias(new Uint8Array(aliasHash.toBuffer()), new Uint8Array(address.toBuffer()), latestNonce),
    );
  }

  async updateAlias({ aliasHash, address, latestNonce }: Alias) {
    await this.alias
      .where({ aliasHash: new Uint8Array(aliasHash.toBuffer()), address: new Uint8Array(address.toBuffer()) })
      .modify({
        latestNonce,
      });
  }

  async getAlias(aliasHash: AliasHash, address: GrumpkinAddress) {
    const alias = await this.alias.get({
      aliasHash: new Uint8Array(aliasHash.toBuffer()),
      address: new Uint8Array(address.toBuffer()),
    });
    return alias ? dexieAliasToAlias(alias) : undefined;
  }

  async getAliases(aliasHash: AliasHash) {
    const aliases = await this.alias.where({ aliasHash: new Uint8Array(aliasHash.toBuffer()) }).toArray();
    return aliases.map(alias => dexieAliasToAlias(alias));
  }

  async getLatestNonceByAddress(address: GrumpkinAddress) {
    const aliases = await this.alias
      .where({
        address: new Uint8Array(address.toBuffer()),
      })
      .reverse()
      .sortBy('latestNonce');
    return aliases[0]?.latestNonce;
  }

  async getLatestNonceByAliasHash(aliasHash: AliasHash) {
    const aliases = await this.alias
      .where({
        aliasHash: new Uint8Array(aliasHash.toBuffer()),
      })
      .reverse()
      .sortBy('latestNonce');
    return aliases[0]?.latestNonce;
  }

  async getAliasHashByAddress(address: GrumpkinAddress, nonce?: number) {
    const collection = this.alias
      .where({
        address: new Uint8Array(address.toBuffer()),
      })
      .filter(a => nonce === undefined || a.latestNonce >= nonce);
    if (nonce === undefined) {
      collection.reverse();
    }
    const aliases = await collection.sortBy('latestNonce');
    return aliases.length ? new AliasHash(Buffer.from(aliases[0].aliasHash)) : undefined;
  }

  async getAddressByAliasHash(aliasHash: AliasHash, nonce?: number) {
    const collection = this.alias
      .where({
        aliasHash: new Uint8Array(aliasHash.toBuffer()),
      })
      .filter(a => nonce === undefined || a.latestNonce >= nonce);
    if (nonce === undefined) {
      collection.reverse();
    }
    const aliases = await collection.sortBy('latestNonce');
    return aliases.length ? new GrumpkinAddress(Buffer.from(aliases[0].address)) : undefined;
  }
}
