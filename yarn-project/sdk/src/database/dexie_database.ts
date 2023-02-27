import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { TreeNote } from '@aztec/barretenberg/note_algorithms';
import { TxId } from '@aztec/barretenberg/tx_id';
import { default as Dexie } from 'dexie';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx } from '../core_tx/index.js';
import { Note } from '../note/index.js';
import { UserData } from '../user/index.js';
import { Alias, BulkUserStateUpdateData, Database, SpendingKey } from './database.js';
import { sortTxs } from './sort_txs.js';

const toSubKeyName = (name: string, index: number) => `${name}__${index}`;

class DexieNote {
  constructor(
    public owner: Uint8Array,
    public assetId: number,
    public value: string,
    public accountRequired: boolean,
    public noteSecret: Uint8Array,
    public creatorPubKey: Uint8Array,
    public inputNullifier: Uint8Array,
    public commitment: Uint8Array,
    public nullifier: Uint8Array,
    public allowChain: boolean,
    public index: number,
    public nullified: 0 | 1,
    public pending: 0 | 1,
    public hashPath?: Uint8Array,
  ) {}
}

const toDexieNote = (note: Note) =>
  new DexieNote(
    new Uint8Array(note.owner.toBuffer()),
    note.assetId,
    note.value.toString(),
    note.treeNote.accountRequired,
    new Uint8Array(note.treeNote.noteSecret),
    new Uint8Array(note.treeNote.creatorPubKey),
    new Uint8Array(note.treeNote.inputNullifier),
    note.commitment,
    note.nullifier,
    note.allowChain,
    note.index || 0,
    note.nullified ? 1 : 0,
    note.index === undefined ? 1 : 0,
    note.hashPath ? new Uint8Array(note.hashPath) : undefined,
  );

const fromDexieNote = ({
  owner,
  assetId,
  value,
  accountRequired,
  noteSecret,
  creatorPubKey,
  inputNullifier,
  commitment,
  nullifier,
  allowChain,
  nullified,
  index,
  pending,
  hashPath,
}: DexieNote) =>
  new Note(
    new TreeNote(
      new GrumpkinAddress(Buffer.from(owner)),
      BigInt(value),
      assetId,
      accountRequired,
      Buffer.from(noteSecret),
      Buffer.from(creatorPubKey),
      Buffer.from(inputNullifier),
    ),
    Buffer.from(commitment),
    Buffer.from(nullifier),
    allowChain,
    !!nullified,
    !pending ? index : undefined,
    hashPath ? Buffer.from(hashPath) : undefined,
  );

class DexieUser {
  constructor(
    public accountPublicKey: Uint8Array,
    public accountPrivateKey: Uint8Array,
    public syncedToRollup: number,
  ) {}
}

const toDexieUser = ({ accountPublicKey, accountPrivateKey, syncedToRollup }: UserData) =>
  new DexieUser(new Uint8Array(accountPublicKey.toBuffer()), new Uint8Array(accountPrivateKey), syncedToRollup);

const fromDexieUser = ({ accountPublicKey, accountPrivateKey, syncedToRollup }: DexieUser): UserData => ({
  accountPublicKey: new GrumpkinAddress(Buffer.from(accountPublicKey)),
  accountPrivateKey: Buffer.from(accountPrivateKey),
  syncedToRollup,
});

class DexieUserTx {
  constructor(
    public txId: Uint8Array,
    public userId: Uint8Array,
    public proofId: number,
    public created: Date,
    public settled: number,
  ) {}
}

const fromDexieUserTx = (tx: DexieUserTx) => {
  switch (tx.proofId) {
    case ProofId.ACCOUNT:
      return fromDexieAccountTx(tx as DexieAccountTx);
    case ProofId.DEFI_DEPOSIT:
      return fromDexieDefiTx(tx as DexieDefiTx);
    default:
      return fromDexiePaymentTx(tx as DexiePaymentTx);
  }
};

class DexiePaymentTx implements DexieUserTx {
  constructor(
    public txId: Uint8Array,
    public userId: Uint8Array,
    public proofId: number,
    public assetId: number,
    public publicValue: string,
    public privateInput: string,
    public recipientPrivateOutput: string,
    public senderPrivateOutput: string,
    public isRecipient: boolean,
    public isSender: boolean,
    public txRefNo: number,
    public created: Date,
    public settled: number, // dexie does not sort a column correctly if some values are undefined
    public publicOwner?: Uint8Array,
  ) {}
}

const toDexiePaymentTx = (tx: CorePaymentTx) =>
  new DexiePaymentTx(
    new Uint8Array(tx.txId.toBuffer()),
    new Uint8Array(tx.userId.toBuffer()),
    tx.proofId,
    tx.assetId,
    tx.publicValue.toString(),
    tx.privateInput.toString(),
    tx.recipientPrivateOutput.toString(),
    tx.senderPrivateOutput.toString(),
    tx.isRecipient,
    tx.isSender,
    tx.txRefNo,
    tx.created,
    tx.settled ? tx.settled.getTime() : 0,
    tx.publicOwner ? new Uint8Array(tx.publicOwner.toBuffer()) : undefined,
  );

const fromDexiePaymentTx = ({
  txId,
  userId,
  proofId,
  assetId,
  publicValue,
  publicOwner,
  privateInput,
  recipientPrivateOutput,
  senderPrivateOutput,
  isRecipient,
  isSender,
  txRefNo,
  created,
  settled,
}: DexiePaymentTx) =>
  new CorePaymentTx(
    new TxId(Buffer.from(txId)),
    new GrumpkinAddress(Buffer.from(userId)),
    proofId,
    assetId,
    BigInt(publicValue),
    publicOwner ? new EthAddress(Buffer.from(publicOwner)) : undefined,
    BigInt(privateInput),
    BigInt(recipientPrivateOutput),
    BigInt(senderPrivateOutput),
    isRecipient,
    isSender,
    txRefNo,
    created,
    settled ? new Date(settled) : undefined,
  );

class DexieAccountTx implements DexieUserTx {
  constructor(
    public txId: Uint8Array,
    public userId: Uint8Array,
    public proofId: number,
    public aliasHash: Uint8Array,
    public migrated: boolean,
    public txRefNo: number,
    public created: Date,
    public settled: number,
    public newSpendingPublicKey1?: Uint8Array,
    public newSpendingPublicKey2?: Uint8Array,
  ) {}
}

const toDexieAccountTx = (tx: CoreAccountTx) =>
  new DexieAccountTx(
    new Uint8Array(tx.txId.toBuffer()),
    new Uint8Array(tx.userId.toBuffer()),
    ProofId.ACCOUNT,
    new Uint8Array(tx.aliasHash.toBuffer()),
    tx.migrated,
    tx.txRefNo,
    tx.created,
    tx.settled ? tx.settled.getTime() : 0,
    tx.newSpendingPublicKey1 ? new Uint8Array(tx.newSpendingPublicKey1) : undefined,
    tx.newSpendingPublicKey2 ? new Uint8Array(tx.newSpendingPublicKey2) : undefined,
  );

const fromDexieAccountTx = ({
  txId,
  userId,
  aliasHash,
  newSpendingPublicKey1,
  newSpendingPublicKey2,
  migrated,
  txRefNo,
  created,
  settled,
}: DexieAccountTx) =>
  new CoreAccountTx(
    new TxId(Buffer.from(txId)),
    new GrumpkinAddress(Buffer.from(userId)),
    new AliasHash(Buffer.from(aliasHash)),
    newSpendingPublicKey1 ? Buffer.from(newSpendingPublicKey1) : undefined,
    newSpendingPublicKey2 ? Buffer.from(newSpendingPublicKey2) : undefined,
    migrated,
    txRefNo,
    created,
    settled ? new Date(settled) : undefined,
  );

// @dev Note: `bridgeId` as is used here is called `bridgeCallData` everywhere else. We kept the old name here in order
//            to not cause inconsistencies in the database on frontend.
class DexieDefiTx implements DexieUserTx {
  constructor(
    public txId: Uint8Array,
    public userId: Uint8Array,
    public proofId: number,
    public bridgeId: Uint8Array,
    public depositValue: string,
    public txFee: string,
    public txRefNo: number,
    public created: Date,
    public partialState: Uint8Array,
    public partialStateSecret: Uint8Array,
    public settled: number,
    public claimSettled: number,
    public nullifier?: Uint8Array,
    public interactionNonce?: number,
    public isAsync?: boolean,
    public success?: boolean,
    public outputValueA?: string,
    public outputValueB?: string,
    public finalised?: Date,
    public claimTxId?: Uint8Array,
  ) {}
}

const toDexieDefiTx = (tx: CoreDefiTx) =>
  new DexieDefiTx(
    new Uint8Array(tx.txId.toBuffer()),
    new Uint8Array(tx.userId.toBuffer()),
    ProofId.DEFI_DEPOSIT,
    new Uint8Array(tx.bridgeCallData.toBuffer()),
    tx.depositValue.toString(),
    tx.txFee.toString(),
    tx.txRefNo,
    tx.created,
    new Uint8Array(tx.partialState),
    new Uint8Array(tx.partialStateSecret),
    tx.settled ? tx.settled.getTime() : 0,
    tx.claimSettled ? tx.claimSettled.getTime() : 0,
    tx.nullifier ? new Uint8Array(tx.nullifier) : undefined,
    tx.interactionNonce,
    tx.isAsync,
    tx.success,
    tx.outputValueA?.toString(),
    tx.outputValueB?.toString(),
    tx.finalised,
    tx.claimTxId ? new Uint8Array(tx.claimTxId.toBuffer()) : undefined,
  );

const fromDexieDefiTx = ({
  txId,
  userId,
  bridgeId,
  depositValue,
  txFee,
  txRefNo,
  created,
  nullifier,
  partialState,
  partialStateSecret,
  settled,
  interactionNonce,
  isAsync,
  success,
  outputValueA,
  outputValueB,
  finalised,
  claimSettled,
  claimTxId,
}: DexieDefiTx) =>
  new CoreDefiTx(
    new TxId(Buffer.from(txId)),
    new GrumpkinAddress(Buffer.from(userId)),
    BridgeCallData.fromBuffer(Buffer.from(bridgeId)),
    BigInt(depositValue),
    BigInt(txFee),
    txRefNo,
    created,
    Buffer.from(partialState),
    Buffer.from(partialStateSecret),
    nullifier ? Buffer.from(nullifier) : undefined,
    settled ? new Date(settled) : undefined,
    interactionNonce,
    isAsync,
    success,
    outputValueA ? BigInt(outputValueA) : undefined,
    outputValueB ? BigInt(outputValueB) : undefined,
    finalised,
    claimSettled ? new Date(claimSettled) : undefined,
    claimTxId ? new TxId(Buffer.from(claimTxId)) : undefined,
  );

class DexieSpendingKey {
  constructor(
    public userId: Uint8Array,
    public key: Uint8Array,
    public treeIndex: number,
    public hashPath: Uint8Array,
  ) {}
}

const toDexieSpendingKey = ({ userId, key, treeIndex, hashPath }: SpendingKey) =>
  new DexieSpendingKey(new Uint8Array(userId.toBuffer()), new Uint8Array(key), treeIndex, new Uint8Array(hashPath));

const fromDexieSpendingKey = ({ userId, key, hashPath, ...rest }: DexieSpendingKey): SpendingKey => ({
  ...rest,
  userId: new GrumpkinAddress(Buffer.from(userId)),
  key: Buffer.from(key),
  hashPath: Buffer.from(hashPath),
});

class DexieAlias {
  constructor(
    public accountPublicKey: Uint8Array,
    public aliasHash: Uint8Array,
    public index: number,
    public noteCommitment1?: Uint8Array,
    public spendingPublicKeyX?: Uint8Array,
  ) {}
}

const toDexieAlias = ({ accountPublicKey, aliasHash, index, noteCommitment1, spendingPublicKeyX }: Alias) =>
  new DexieAlias(
    new Uint8Array(accountPublicKey.toBuffer()),
    new Uint8Array(aliasHash.toBuffer()),
    index,
    noteCommitment1 ? new Uint8Array(noteCommitment1) : undefined,
    spendingPublicKeyX ? new Uint8Array(spendingPublicKeyX) : undefined,
  );

const fromDexieAlias = ({
  accountPublicKey,
  aliasHash,
  index,
  noteCommitment1,
  spendingPublicKeyX,
}: DexieAlias): Alias => ({
  accountPublicKey: new GrumpkinAddress(Buffer.from(accountPublicKey)),
  aliasHash: new AliasHash(Buffer.from(aliasHash)),
  index,
  noteCommitment1: noteCommitment1 ? Buffer.from(noteCommitment1) : undefined,
  spendingPublicKeyX: spendingPublicKeyX ? Buffer.from(spendingPublicKeyX) : undefined,
});

class DexieKey {
  constructor(public name: string, public value: Uint8Array, public size?: number, public count?: number) {}
}

interface DexieMutex {
  name: string;
  expiredAt: number;
}

export class DexieDatabase implements Database {
  private dexie!: Dexie;
  private alias!: Dexie.Table<DexieAlias, Uint8Array>;
  private key!: Dexie.Table<DexieKey, string>;
  private mutex!: Dexie.Table<DexieMutex, string>;
  private note!: Dexie.Table<DexieNote, Uint8Array>;
  private spendingKey!: Dexie.Table<DexieSpendingKey, Uint8Array>;
  private user!: Dexie.Table<DexieUser, Uint8Array>;
  private userTx!: Dexie.Table<DexieUserTx, Uint8Array>;
  private debug = createDebugLogger('bb:dexie_database');

  constructor(private dbName = 'hummus', private version = 8) {}

  async open() {
    if (await Dexie.exists(this.dbName)) {
      const db = await new Dexie(this.dbName).open();
      if (db.verno < 8) {
        this.debug(`Upgrade db from version ${db.verno} to ${this.version}. Deleting all tables...`);
        // Breaking changes in version 8:
        // - Change the primary key of alias table from `accountPublicKey` to `aliasHash`.
        // - Remove claimTx table and store the data in userTx table.

        // Dexie does not support changing primary key for an existing table. We have to delete the alias table and
        // recreate it.
        // Data in claimTx would have to be copied to the associated defiTx in userTx table.
        // Easier to delete all tables before upgrading to version 8, and make the users resync and reconstruct everthing.
        await db.delete();
      }
    }

    this.createTables();
  }

  close() {
    this.dexie.close();
    return Promise.resolve();
  }

  async clear() {
    await this.dexie.delete();
    this.createTables();
  }

  async addNote(note: Note) {
    await this.note.put(toDexieNote(note));
  }

  async getNote(commitment: Buffer) {
    const note = await this.note.get({ commitment: new Uint8Array(commitment) });
    return note ? fromDexieNote(note) : undefined;
  }

  async getNoteByNullifier(nullifier: Buffer) {
    const note = await this.note.get({ nullifier: new Uint8Array(nullifier) });
    return note ? fromDexieNote(note) : undefined;
  }

  async nullifyNote(nullifier: Buffer) {
    await this.note.where({ nullifier: new Uint8Array(nullifier) }).modify({ nullified: 1 });
  }

  async getNotes(userId: GrumpkinAddress) {
    return (await this.note.where({ owner: new Uint8Array(userId.toBuffer()), nullified: 0 }).toArray()).map(
      fromDexieNote,
    );
  }

  async getPendingNotes(userId: GrumpkinAddress) {
    return (await this.note.where({ owner: new Uint8Array(userId.toBuffer()), pending: 1 }).toArray()).map(
      fromDexieNote,
    );
  }

  async removeNote(nullifier: Buffer) {
    await this.note.where({ nullifier: new Uint8Array(nullifier) }).delete();
  }

  async getUser(accountPublicKey: GrumpkinAddress) {
    const user = await this.user.get(new Uint8Array(accountPublicKey.toBuffer()));
    return user ? fromDexieUser(user) : undefined;
  }

  async getUsers() {
    return (await this.user.toArray()).map(fromDexieUser);
  }

  async addUser(user: UserData) {
    await this.user.put(toDexieUser(user));
  }

  async updateUser(user: UserData) {
    await this.user
      .where({ accountPublicKey: new Uint8Array(user.accountPublicKey.toBuffer()) })
      .modify(toDexieUser(user));
  }

  async removeUser(accountPublicKey: GrumpkinAddress) {
    const userId = new Uint8Array(accountPublicKey.toBuffer());
    await this.user.where({ accountPublicKey: userId }).delete();
    await this.userTx.where({ userId }).delete();
    await this.spendingKey.where({ userId }).delete();
    await this.note.where({ owner: userId }).delete();
  }

  async resetUsers() {
    await this.user.toCollection().modify({ syncedToRollup: -1 });
    await this.note.clear();
    await this.userTx.clear();
    await this.spendingKey.clear();
  }

  async upsertPaymentTx(tx: CorePaymentTx) {
    await this.userTx.put(toDexiePaymentTx(tx));
  }

  async getPaymentTx(userId: GrumpkinAddress, txId: TxId) {
    const tx = await this.userTx.get({
      txId: new Uint8Array(txId.toBuffer()),
      userId: new Uint8Array(userId.toBuffer()),
    });
    return tx && [ProofId.DEPOSIT, ProofId.WITHDRAW, ProofId.SEND].includes(tx.proofId)
      ? fromDexiePaymentTx(tx as DexiePaymentTx)
      : undefined;
  }

  async getPaymentTxs(userId: GrumpkinAddress) {
    const txs = (
      await this.userTx
        .where({ userId: new Uint8Array(userId.toBuffer()) })
        .reverse()
        .sortBy('settled')
    ).filter(p => [ProofId.DEPOSIT, ProofId.WITHDRAW, ProofId.SEND].includes(p.proofId)) as DexiePaymentTx[];
    return sortTxs(txs).map(fromDexiePaymentTx);
  }

  async upsertAccountTx(tx: CoreAccountTx) {
    await this.userTx.put(toDexieAccountTx(tx));
  }

  async getAccountTx(txId: TxId) {
    const tx = await this.userTx.get({
      txId: new Uint8Array(txId.toBuffer()),
      proofId: ProofId.ACCOUNT,
    });
    return tx ? fromDexieAccountTx(tx as DexieAccountTx) : undefined;
  }

  async getAccountTxs(userId: GrumpkinAddress) {
    const txs = (await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()), proofId: ProofId.ACCOUNT })
      .reverse()
      .sortBy('settled')) as DexieAccountTx[];
    return sortTxs(txs).map(fromDexieAccountTx);
  }

  async upsertDefiTx(tx: CoreDefiTx) {
    await this.userTx.put(toDexieDefiTx(tx));
  }

  async getDefiTx(txId: TxId) {
    const tx = await this.userTx.get({
      txId: new Uint8Array(txId.toBuffer()),
      proofId: ProofId.DEFI_DEPOSIT,
    });
    return tx ? fromDexieDefiTx(tx as DexieDefiTx) : undefined;
  }

  async getDefiTxs(userId: GrumpkinAddress) {
    const txs = (await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()), proofId: ProofId.DEFI_DEPOSIT })
      .reverse()
      .sortBy('settled')) as DexieDefiTx[];
    return sortTxs(txs).map(fromDexieDefiTx);
  }

  async getUnclaimedDefiTxs(userId: GrumpkinAddress) {
    const txs = (await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()), proofId: ProofId.DEFI_DEPOSIT, claimSettled: 0 })
      .reverse()
      .sortBy('settled')) as DexieDefiTx[];
    return sortTxs(txs).map(fromDexieDefiTx);
  }

  async getUserTxs(userId: GrumpkinAddress) {
    const txs = await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()) })
      .reverse()
      .sortBy('settled');
    return sortTxs(txs).map(fromDexieUserTx);
  }

  async isUserTxSettled(txId: TxId) {
    const txs = await this.userTx.where({ txId: new Uint8Array(txId.toBuffer()) }).toArray();
    return txs.length > 0 && txs.every(tx => tx.settled);
  }

  async getPendingUserTxs(userId: GrumpkinAddress) {
    const unsettledTxs = await this.userTx.where({ userId: new Uint8Array(userId.toBuffer()), settled: 0 }).toArray();
    return unsettledTxs.map(fromDexieUserTx);
  }

  async removeUserTx(userId: GrumpkinAddress, txId: TxId) {
    await this.userTx
      .where({ txId: new Uint8Array(txId.toBuffer()), userId: new Uint8Array(userId.toBuffer()) })
      .delete();
  }

  async addSpendingKey(spendingKey: SpendingKey) {
    await this.spendingKey.put(toDexieSpendingKey(spendingKey));
  }

  async addSpendingKeys(spendingKeys: SpendingKey[]) {
    await this.spendingKey.bulkPut(spendingKeys.map(toDexieSpendingKey));
  }

  async getSpendingKey(userId: GrumpkinAddress, spendingKey: GrumpkinAddress) {
    const key = await this.spendingKey.get({
      userId: new Uint8Array(userId.toBuffer()),
      key: new Uint8Array(spendingKey.toBuffer().slice(0, 32)),
    });
    return key ? fromDexieSpendingKey(key) : undefined;
  }

  async getSpendingKeys(userId: GrumpkinAddress) {
    const spendingKeys = await this.spendingKey.where({ userId: new Uint8Array(userId.toBuffer()) }).toArray();
    return spendingKeys.map(fromDexieSpendingKey);
  }

  async removeSpendingKeys(userId: GrumpkinAddress) {
    await this.spendingKey.where({ userId: new Uint8Array(userId.toBuffer()) }).delete();
  }

  async addAlias(alias: Alias) {
    return await this.addAliases([alias]);
  }

  async addAliases(aliases: Alias[]) {
    const dbAliases = aliases.map(toDexieAlias);
    await this.alias.bulkPut(dbAliases);
  }

  async getAlias(accountPublicKey: GrumpkinAddress) {
    const alias = await this.alias.get({ accountPublicKey: new Uint8Array(accountPublicKey.toBuffer()) });
    return alias ? fromDexieAlias(alias) : undefined;
  }

  async getAliasByAliasHash(aliasHash: AliasHash) {
    const aliases = await this.alias.where({ aliasHash: new Uint8Array(aliasHash.toBuffer()) }).toArray();
    return aliases.map(fromDexieAlias).sort((a, b) => (a.index < b.index ? 1 : -1))[0];
  }

  async addKey(name: string, value: Buffer, MAX_BYTE_LENGTH = 100000000) {
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

  async acquireLock(name: string, timeout: number) {
    const now = Date.now();
    await this.mutex.filter(lock => lock.name === name && lock.expiredAt <= now).delete();
    try {
      await this.mutex.add({ name, expiredAt: now + timeout });
      return true;
    } catch (e) {
      return false;
    }
  }

  async extendLock(name: string, timeout: number) {
    await this.mutex.update(name, { expiredAt: Date.now() + timeout });
  }

  async releaseLock(name: string) {
    await this.mutex.delete(name);
  }

  public async bulkUserStateUpdate(data: BulkUserStateUpdateData): Promise<void> {
    await this.dexie.transaction('rw', ['note', 'spendingKey', 'user', 'userTx'], async () => {
      await Promise.all(
        [
          data.updateUserArgs.map(args => this.updateUser(...args)),
          data.addSpendingKeyArgs.map(args => this.addSpendingKey(...args)),
          data.upsertAccountTxArgs.map(args => this.upsertAccountTx(...args)),
          data.upsertPaymentTxArgs.map(args => this.upsertPaymentTx(...args)),
          data.upsertDefiTxArgs.map(args => this.upsertDefiTx(...args)),
          data.addNoteArgs.map(args => this.addNote(...args)),
        ].flat(),
      );
      await Promise.all(data.nullifyNoteArgs.map(args => this.nullifyNote(...args)));
    });
  }

  private createTables() {
    this.dexie = new Dexie(this.dbName);
    this.dexie.version(this.version).stores({
      alias: '&aliasHash, accountPublicKey',
      key: '&name',
      mutex: '&name',
      note: '&commitment, nullifier, [owner+nullified], [owner+pending]',
      spendingKey: '&[userId+key], userId',
      user: '&accountPublicKey',
      userTx:
        '&[txId+userId], txId, [txId+proofId], [userId+proofId], userId, [userId+settled], [userId+proofId+claimSettled]',
    });

    this.alias = this.dexie.table('alias');
    this.key = this.dexie.table('key');
    this.mutex = this.dexie.table('mutex');
    this.note = this.dexie.table('note');
    this.spendingKey = this.dexie.table('spendingKey');
    this.user = this.dexie.table('user');
    this.userTx = this.dexie.table('userTx');
  }
}
