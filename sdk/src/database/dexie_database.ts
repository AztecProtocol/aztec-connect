import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TreeNote } from '@aztec/barretenberg/note_algorithms';
import { TxId } from '@aztec/barretenberg/tx_id';
import Dexie from 'dexie';
import { CoreAccountTx, CoreClaimTx, CoreDefiTx, CorePaymentTx } from '../core_tx';
import { Note } from '../note';
import { UserData } from '../user';
import { Alias, Database, SpendingKey } from './database';

const MAX_BYTE_LENGTH = 100000000;

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

class DexieKey {
  constructor(public name: string, public value: Uint8Array, public size: number, public count?: number) {}
}

class DexieUser {
  constructor(public id: Uint8Array, public accountPrivateKey: Uint8Array, public syncedToRollup: number) {}
}

const toDexieUser = ({ id, accountPrivateKey, syncedToRollup }: UserData) =>
  new DexieUser(new Uint8Array(id.toBuffer()), new Uint8Array(accountPrivateKey), syncedToRollup);

const fromDexieUser = ({ id, accountPrivateKey, syncedToRollup }: DexieUser): UserData => {
  const accountPublicKey = new GrumpkinAddress(Buffer.from(id));
  return {
    id: accountPublicKey,
    accountPublicKey,
    accountPrivateKey: Buffer.from(accountPrivateKey),
    syncedToRollup,
  };
};

class DexieUserTx {
  constructor(
    public txId: Uint8Array,
    public userId: Uint8Array,
    public proofId: number,
    public created: Date,
    public settled: number,
  ) {}
}

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

class DexieDefiTx implements DexieUserTx {
  constructor(
    public txId: Uint8Array,
    public userId: Uint8Array,
    public proofId: number,
    public bridgeId: Uint8Array,
    public depositValue: string,
    public txFee: string,
    public partialStateSecret: Uint8Array,
    public txRefNo: number,
    public created: Date,
    public settled: number,
    public interactionNonce?: number,
    public isAsync?: boolean,
    public success?: boolean,
    public outputValueA?: string,
    public outputValueB?: string,
    public finalised?: Date,
    public claimSettled?: Date,
    public claimTxId?: Uint8Array,
  ) {}
}

const toDexieDefiTx = (tx: CoreDefiTx) =>
  new DexieDefiTx(
    new Uint8Array(tx.txId.toBuffer()),
    new Uint8Array(tx.userId.toBuffer()),
    ProofId.DEFI_DEPOSIT,
    new Uint8Array(tx.bridgeId.toBuffer()),
    tx.depositValue.toString(),
    tx.txFee.toString(),
    new Uint8Array(tx.partialStateSecret),
    tx.txRefNo,
    tx.created,
    tx.settled ? tx.settled.getTime() : 0,
    tx.interactionNonce,
    tx.isAsync,
    tx.success,
    tx.outputValueA?.toString(),
    tx.outputValueB?.toString(),
    tx.finalised,
    tx.claimSettled,
    tx.claimTxId ? new Uint8Array(tx.claimTxId.toBuffer()) : undefined,
  );

const fromDexieDefiTx = ({
  txId,
  userId,
  bridgeId,
  depositValue,
  txFee,
  partialStateSecret,
  txRefNo,
  created,
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
    BridgeId.fromBuffer(Buffer.from(bridgeId)),
    BigInt(depositValue),
    BigInt(txFee),
    Buffer.from(partialStateSecret),
    txRefNo,
    created,
    settled ? new Date(settled) : undefined,
    interactionNonce,
    isAsync,
    success,
    outputValueA ? BigInt(outputValueA) : undefined,
    outputValueB ? BigInt(outputValueB) : undefined,
    finalised,
    claimSettled,
    claimTxId ? new TxId(Buffer.from(claimTxId)) : undefined,
  );

class DexieClaimTx {
  constructor(
    public nullifier: Uint8Array,
    public txId: Uint8Array,
    public userId: Uint8Array,
    public secret: Uint8Array,
    public interactionNonce: number,
  ) {}
}

const toDexieClaimTx = (claim: CoreClaimTx) =>
  new DexieClaimTx(
    new Uint8Array(claim.nullifier),
    new Uint8Array(claim.defiTxId.toBuffer()),
    new Uint8Array(claim.userId.toBuffer()),
    new Uint8Array(claim.secret),
    claim.interactionNonce,
  );

const fromDexieClaimTx = ({ nullifier, txId, userId, secret, interactionNonce }: DexieClaimTx): CoreClaimTx => ({
  nullifier: Buffer.from(nullifier),
  defiTxId: new TxId(Buffer.from(txId)),
  userId: new GrumpkinAddress(Buffer.from(userId)),
  secret: Buffer.from(secret),
  interactionNonce,
});

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
  constructor(public accountPublicKey: Uint8Array, public aliasHash: Uint8Array, public index: number) {}
}

const toDexieAlias = ({ accountPublicKey, aliasHash, index }: Alias) =>
  new DexieAlias(new Uint8Array(accountPublicKey.toBuffer()), new Uint8Array(aliasHash.toBuffer()), index);

const fromDexieAlias = ({ accountPublicKey, aliasHash, index }: DexieAlias): Alias => ({
  accountPublicKey: new GrumpkinAddress(Buffer.from(accountPublicKey)),
  aliasHash: new AliasHash(Buffer.from(aliasHash)),
  index,
});

const sortUserTxs = (txs: DexieUserTx[]) => {
  const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
  const settled = txs.filter(tx => tx.settled);
  return [...unsettled, ...settled];
};

interface DexieMutex {
  name: string;
  expiredAt: number;
}

export class DexieDatabase implements Database {
  private dexie!: Dexie;
  private alias!: Dexie.Table<DexieAlias, Uint8Array>;
  private claimTx!: Dexie.Table<DexieClaimTx, Uint8Array>;
  private key!: Dexie.Table<DexieKey, string>;
  private mutex!: Dexie.Table<DexieMutex, string>;
  private note!: Dexie.Table<DexieNote, Uint8Array>;
  private spendingKey!: Dexie.Table<DexieSpendingKey, Uint8Array>;
  private user!: Dexie.Table<DexieUser, Uint8Array>;
  private userTx!: Dexie.Table<DexieUserTx, Uint8Array>;

  constructor(private dbName = 'hummus', private version = 6) {}

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
      alias: '&accountPublicKey, aliasHash',
      claimTx: '&nullifier, userId',
      key: '&name',
      mutex: '&name',
      note: '&commitment, nullifier, [owner+nullified], [owner+pending]',
      spendingKey: '&[userId+key], userId',
      user: '&id',
      userTx:
        '&[txId+userId], txId, [txId+proofId], [userId+proofId], proofId, settled, [userId+proofId+interactionNonce]',
    });

    this.alias = this.dexie.table('alias');
    this.claimTx = this.dexie.table('claimTx');
    this.key = this.dexie.table('key');
    this.mutex = this.dexie.table('mutex');
    this.note = this.dexie.table('note');
    this.spendingKey = this.dexie.table('spendingKey');
    this.user = this.dexie.table('user');
    this.userTx = this.dexie.table('userTx');
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

  async addClaimTx(tx: CoreClaimTx) {
    await this.claimTx.put(toDexieClaimTx(tx));
  }

  async getClaimTx(nullifier: Buffer) {
    const tx = await this.claimTx.get({ nullifier: new Uint8Array(nullifier) });
    return tx ? fromDexieClaimTx(tx) : undefined;
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

  async getUser(userId: GrumpkinAddress) {
    const user = await this.user.get(new Uint8Array(userId.toBuffer()));
    return user ? fromDexieUser(user) : undefined;
  }

  async getUsers() {
    return (await this.user.toArray()).map(fromDexieUser);
  }

  async addUser(user: UserData) {
    await this.user.put(toDexieUser(user));
  }

  async updateUser(user: UserData) {
    await this.user.where({ id: new Uint8Array(user.id.toBuffer()) }).modify(toDexieUser(user));
  }

  async addPaymentTx(tx: CorePaymentTx) {
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
    ).filter(p => [ProofId.DEPOSIT, ProofId.WITHDRAW, ProofId.SEND].includes(p.proofId));
    return (sortUserTxs(txs) as DexiePaymentTx[]).map(fromDexiePaymentTx);
  }

  async settlePaymentTx(userId: GrumpkinAddress, txId: TxId, settled: Date) {
    await this.userTx
      .where({
        txId: new Uint8Array(txId.toBuffer()),
        userId: new Uint8Array(userId.toBuffer()),
      })
      .modify({ settled });
  }

  async addAccountTx(tx: CoreAccountTx) {
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
    const txs = await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()), proofId: ProofId.ACCOUNT })
      .reverse()
      .sortBy('settled');
    return (sortUserTxs(txs) as DexieAccountTx[]).map(fromDexieAccountTx);
  }

  async settleAccountTx(txId: TxId, settled: Date) {
    await this.userTx.where({ txId: new Uint8Array(txId.toBuffer()), proofId: ProofId.ACCOUNT }).modify({ settled });
  }

  async addDefiTx(tx: CoreDefiTx) {
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
    const txs = await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()), proofId: ProofId.DEFI_DEPOSIT })
      .reverse()
      .sortBy('settled');
    return (sortUserTxs(txs) as DexieDefiTx[]).map(fromDexieDefiTx);
  }

  async getDefiTxsByNonce(userId: GrumpkinAddress, interactionNonce: number) {
    const txs = (await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()), proofId: ProofId.DEFI_DEPOSIT, interactionNonce })
      .reverse()
      .sortBy('settled')) as DexieDefiTx[];
    return (sortUserTxs(txs) as DexieDefiTx[]).map(fromDexieDefiTx);
  }

  async settleDefiDeposit(txId: TxId, interactionNonce: number, isAsync: boolean, settled: Date) {
    await this.userTx
      .where({ txId: new Uint8Array(txId.toBuffer()), proofId: ProofId.DEFI_DEPOSIT })
      .modify({ interactionNonce, isAsync, settled });
  }

  async updateDefiTxFinalisationResult(
    txId: TxId,
    success: boolean,
    outputValueA: bigint,
    outputValueB: bigint,
    finalised: Date,
  ) {
    await this.userTx
      .where({ txId: new Uint8Array(txId.toBuffer()), proofId: ProofId.DEFI_DEPOSIT })
      .modify({ success, outputValueA, outputValueB, finalised });
  }

  async settleDefiTx(txId: TxId, claimSettled: Date, claimTxId: TxId) {
    await this.userTx
      .where({ txId: new Uint8Array(txId.toBuffer()), proofId: ProofId.DEFI_DEPOSIT })
      .modify({ claimSettled, claimTxId: new Uint8Array(claimTxId.toBuffer()) });
  }

  async getUserTxs(userId: GrumpkinAddress) {
    const txs = await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()) })
      .reverse()
      .sortBy('settled');
    return sortUserTxs(txs).map(tx => {
      switch (tx.proofId) {
        case ProofId.ACCOUNT:
          return fromDexieAccountTx(tx as DexieAccountTx);
        case ProofId.DEFI_DEPOSIT:
          return fromDexieDefiTx(tx as DexieDefiTx);
        default:
          return fromDexiePaymentTx(tx as DexiePaymentTx);
      }
    });
  }

  async isUserTxSettled(txId: TxId) {
    const txs = await this.userTx.where({ txId: new Uint8Array(txId.toBuffer()) }).toArray();
    return txs.length > 0 && txs.every(tx => tx.settled);
  }

  async getPendingUserTxs(userId: GrumpkinAddress) {
    const unsettledTxs = await this.userTx.where({ settled: 0 }).toArray();
    return unsettledTxs
      .flat()
      .filter(tx => new GrumpkinAddress(Buffer.from(tx.userId)).equals(userId))
      .map(({ txId }) => new TxId(Buffer.from(txId)));
  }

  async removeUserTx(userId: GrumpkinAddress, txId: TxId) {
    await this.userTx
      .where({ txId: new Uint8Array(txId.toBuffer()), userId: new Uint8Array(userId.toBuffer()) })
      .delete();
  }

  async removeUser(userId: GrumpkinAddress) {
    const id = new Uint8Array(userId.toBuffer());
    await this.user.where({ id }).delete();
    await this.userTx.where({ userId: id }).delete();
    await this.claimTx.where({ userId: id }).delete();
    await this.spendingKey.where({ userId: id }).delete();
    await this.note.where({ owner: id }).delete();
  }

  async resetUsers() {
    await this.user.toCollection().modify({ syncedToRollup: -1 });
    await this.note.clear();
    await this.userTx.clear();
    await this.claimTx.clear();
    await this.spendingKey.clear();
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
    return this.addAliases([alias]);
  }

  async addAliases(aliases: Alias[]) {
    const dbAliases = aliases.map(toDexieAlias);
    await this.alias.bulkPut(dbAliases);
  }

  async getAlias(accountPublicKey: GrumpkinAddress) {
    const alias = await this.alias.get({ accountPublicKey: new Uint8Array(accountPublicKey.toBuffer()) });
    return alias ? fromDexieAlias(alias) : undefined;
  }

  async getAliases(aliasHash: AliasHash) {
    const aliases = await this.alias.where({ aliasHash: new Uint8Array(aliasHash.toBuffer()) }).toArray();
    return aliases.map(fromDexieAlias).sort((a, b) => (a.index < b.index ? 1 : -1));
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
}
