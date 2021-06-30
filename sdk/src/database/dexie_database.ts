import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import Dexie from 'dexie';
import { Note } from '../note';
import { AccountId, UserData } from '../user';
import { UserAccountTx, UserDefiTx, UserJoinSplitTx } from '../user_tx';
import { Claim } from './claim';
import { Alias, Database, SigningKey } from './database';

const MAX_BYTE_LENGTH = 100000000;

const toSubKeyName = (name: string, index: number) => `${name}__${index}`;

class DexieNote {
  constructor(
    public id: number,
    public assetId: number,
    public value: string,
    public dataEntry: Uint8Array,
    public secret: Uint8Array,
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
    note.secret,
    note.nullifier,
    note.nullified ? 1 : 0,
    new Uint8Array(note.owner.toBuffer()),
  );

const dexieNoteToNote = ({ id, value, dataEntry, secret, nullifier, nullified, owner, ...rest }: DexieNote): Note => ({
  ...rest,
  index: id,
  value: BigInt(value),
  dataEntry: Buffer.from(dataEntry),
  secret: Buffer.from(secret),
  nullifier: Buffer.from(nullifier),
  nullified: !!nullified,
  owner: AccountId.fromBuffer(Buffer.from(owner)),
});

class DexieClaim {
  constructor(
    public nullifier: Uint8Array,
    public txHash: Uint8Array,
    public secret: Uint8Array,
    public owner: Uint8Array,
  ) {}
}

const toDexieClaim = (claim: Claim) =>
  new DexieClaim(
    new Uint8Array(claim.nullifier),
    new Uint8Array(claim.txHash.toBuffer()),
    new Uint8Array(claim.secret),
    new Uint8Array(claim.owner.toBuffer()),
  );

const fromDexieClaim = ({ nullifier, txHash, secret, owner }: DexieClaim): Claim => ({
  nullifier: Buffer.from(nullifier),
  txHash: new TxHash(Buffer.from(txHash)),
  secret: Buffer.from(secret),
  owner: AccountId.fromBuffer(Buffer.from(owner)),
});

class DexieKey {
  constructor(public name: string, public value: Uint8Array, public size: number, public count?: number) {}
}

class DexieUser {
  constructor(
    public id: Uint8Array,
    public privateKey: Uint8Array,
    public syncedToRollup: number,
    public aliasHash?: Uint8Array,
  ) {}
}

const userToDexieUser = ({ id, privateKey, aliasHash, syncedToRollup }: UserData) =>
  new DexieUser(
    new Uint8Array(id.toBuffer()),
    new Uint8Array(privateKey),
    syncedToRollup,
    aliasHash ? new Uint8Array(aliasHash.toBuffer()) : undefined,
  );

const dexieUserToUser = (user: DexieUser): UserData => {
  const id = AccountId.fromBuffer(Buffer.from(user.id));
  return {
    id,
    publicKey: id.publicKey,
    nonce: id.nonce,
    privateKey: Buffer.from(user.privateKey),
    syncedToRollup: user.syncedToRollup,
    aliasHash: user.aliasHash ? new AliasHash(Buffer.from(user.aliasHash)) : undefined,
  };
};

class DexieUserTx {
  constructor(public txHash: Uint8Array, public userId: Uint8Array, public proofId: number, public settled: number) {}
}

class DexieJoinSplitTx implements DexieUserTx {
  constructor(
    public txHash: Uint8Array,
    public userId: Uint8Array,
    public proofId: number,
    public assetId: number,
    public publicInput: string,
    public publicOutput: string,
    public privateInput: string,
    public recipientPrivateOutput: string,
    public senderPrivateOutput: string,
    public ownedByUser: boolean,
    public created: Date,
    public settled: number, // dexie does not sort a column correctly if some values are undefined
    public inputOwner?: Uint8Array,
    public outputOwner?: Uint8Array,
  ) {}
}

const toDexieJoinSplitTx = (tx: UserJoinSplitTx) =>
  new DexieJoinSplitTx(
    new Uint8Array(tx.txHash.toBuffer()),
    new Uint8Array(tx.userId.toBuffer()),
    ProofId.JOIN_SPLIT,
    tx.assetId,
    tx.publicInput.toString(),
    tx.publicOutput.toString(),
    tx.privateInput.toString(),
    tx.recipientPrivateOutput.toString(),
    tx.senderPrivateOutput.toString(),
    tx.ownedByUser,
    tx.created,
    tx.settled ? tx.settled.getTime() : 0,
    tx.inputOwner ? new Uint8Array(tx.inputOwner.toBuffer()) : undefined,
    tx.outputOwner ? new Uint8Array(tx.outputOwner.toBuffer()) : undefined,
  );

const fromDexieJoinSplitTx = ({
  txHash,
  userId,
  assetId,
  publicInput,
  publicOutput,
  privateInput,
  recipientPrivateOutput,
  senderPrivateOutput,
  inputOwner,
  outputOwner,
  ownedByUser,
  created,
  settled,
}: DexieJoinSplitTx) =>
  new UserJoinSplitTx(
    new TxHash(Buffer.from(txHash)),
    AccountId.fromBuffer(Buffer.from(userId)),
    assetId,
    BigInt(publicInput),
    BigInt(publicOutput),
    BigInt(privateInput),
    BigInt(recipientPrivateOutput),
    BigInt(senderPrivateOutput),
    inputOwner ? new EthAddress(Buffer.from(inputOwner)) : undefined,
    outputOwner ? new EthAddress(Buffer.from(outputOwner)) : undefined,
    ownedByUser,
    created,
    settled ? new Date(settled) : undefined,
  );

class DexieAccountTx implements DexieUserTx {
  constructor(
    public txHash: Uint8Array,
    public userId: Uint8Array,
    public proofId: number,
    public aliasHash: Uint8Array,
    public migrated: boolean,
    public created: Date,
    public settled: number,
    public newSigningPubKey1?: Uint8Array,
    public newSigningPubKey2?: Uint8Array,
  ) {}
}

const toDexieAccountTx = (tx: UserAccountTx) =>
  new DexieAccountTx(
    new Uint8Array(tx.txHash.toBuffer()),
    new Uint8Array(tx.userId.toBuffer()),
    ProofId.ACCOUNT,
    new Uint8Array(tx.aliasHash.toBuffer()),
    tx.migrated,
    tx.created,
    tx.settled ? tx.settled.getTime() : 0,
    tx.newSigningPubKey1 ? new Uint8Array(tx.newSigningPubKey1) : undefined,
    tx.newSigningPubKey2 ? new Uint8Array(tx.newSigningPubKey2) : undefined,
  );

const fromDexieAccountTx = ({
  txHash,
  userId,
  aliasHash,
  newSigningPubKey1,
  newSigningPubKey2,
  migrated,
  created,
  settled,
}: DexieAccountTx) =>
  new UserAccountTx(
    new TxHash(Buffer.from(txHash)),
    AccountId.fromBuffer(Buffer.from(userId)),
    new AliasHash(Buffer.from(aliasHash)),
    newSigningPubKey1 ? Buffer.from(newSigningPubKey1) : undefined,
    newSigningPubKey2 ? Buffer.from(newSigningPubKey2) : undefined,
    migrated,
    created,
    settled ? new Date(settled) : undefined,
  );

class DexieDefiTx implements DexieUserTx {
  constructor(
    public txHash: Uint8Array,
    public userId: Uint8Array,
    public proofId: number,
    public bridgeId: Uint8Array,
    public depositValue: string,
    public txFee: string,
    public outputValueA: string,
    public outputValueB: string,
    public created: Date,
    public settled: number,
  ) {}
}

const toDexieDefiTx = (tx: UserDefiTx) =>
  new DexieDefiTx(
    new Uint8Array(tx.txHash.toBuffer()),
    new Uint8Array(tx.userId.toBuffer()),
    ProofId.DEFI_DEPOSIT,
    new Uint8Array(tx.bridgeId.toBuffer()),
    tx.depositValue.toString(),
    tx.txFee.toString(),
    tx.outputValueA.toString(),
    tx.outputValueB.toString(),
    tx.created,
    tx.settled ? tx.settled.getTime() : 0,
  );

const fromDexieDefiTx = ({
  txHash,
  userId,
  bridgeId,
  depositValue,
  txFee,
  outputValueA,
  outputValueB,
  created,
  settled,
}: DexieDefiTx) =>
  new UserDefiTx(
    new TxHash(Buffer.from(txHash)),
    AccountId.fromBuffer(Buffer.from(userId)),
    BridgeId.fromBuffer(Buffer.from(bridgeId)),
    BigInt(depositValue),
    BigInt(txFee),
    created,
    BigInt(outputValueA),
    BigInt(outputValueB),
    settled ? new Date(settled) : undefined,
  );

class DexieUserKey {
  constructor(public accountId: Uint8Array, public key: Uint8Array, public treeIndex: number) {}
}

const dexieUserKeyToSigningKey = (userKey: DexieUserKey): SigningKey => ({
  ...userKey,
  accountId: AccountId.fromBuffer(Buffer.from(userKey.accountId)),
  key: Buffer.from(userKey.key),
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
  private claim!: Dexie.Table<DexieClaim, number>;
  private key!: Dexie.Table<DexieKey, string>;
  private alias!: Dexie.Table<DexieAlias, number>;

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
      alias: '&[aliasHash+address], aliasHash, address, latestNonce',
      claim: '&nullifier',
      key: '&name',
      note: '++id, [owner+nullified], nullifier, owner',
      user: '&id, privateKey',
      userKeys: '&[accountId+key], accountId',
      userTx: '&[txHash+userId], txHash, [txHash+proofId], [userId+proofId], proofId, settled',
    });

    this.alias = this.dexie.table('alias');
    this.claim = this.dexie.table('claim');
    this.key = this.dexie.table('key');
    this.note = this.dexie.table('note');
    this.user = this.dexie.table('user');
    this.userKeys = this.dexie.table('userKeys');
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

  async addClaim(claim: Claim) {
    await this.claim.put(toDexieClaim(claim));
  }

  async getClaim(nullifier: Buffer) {
    const claim = await this.claim.get({ nullifier: new Uint8Array(nullifier) });
    return claim ? fromDexieClaim(claim) : undefined;
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

  async addJoinSplitTx(tx: UserJoinSplitTx) {
    await this.userTx.put(toDexieJoinSplitTx(tx));
  }

  async getJoinSplitTx(txHash: TxHash, userId: AccountId) {
    const tx = await this.userTx.get({
      txHash: new Uint8Array(txHash.toBuffer()),
      userId: new Uint8Array(userId.toBuffer()),
    });
    return tx?.proofId === ProofId.JOIN_SPLIT ? fromDexieJoinSplitTx(tx as DexieJoinSplitTx) : undefined;
  }

  async getJoinSplitTxs(userId: AccountId) {
    const txs = (await this.userTx
      .where({ proofId: ProofId.JOIN_SPLIT, userId: new Uint8Array(userId.toBuffer()) })
      .reverse()
      .sortBy('settled')) as DexieJoinSplitTx[];
    const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
    const settled = txs.filter(tx => tx.settled);
    return [...unsettled, ...settled].map(fromDexieJoinSplitTx);
  }

  async settleJoinSplitTx(txHash: TxHash, userId: AccountId, settled: Date) {
    await this.userTx
      .where({
        txHash: new Uint8Array(txHash.toBuffer()),
        userId: new Uint8Array(userId.toBuffer()),
      })
      .modify({ settled });
  }

  async addAccountTx(tx: UserAccountTx) {
    await this.userTx.put(toDexieAccountTx(tx));
  }

  async getAccountTx(txHash: TxHash) {
    const tx = await this.userTx.get({
      txHash: new Uint8Array(txHash.toBuffer()),
      proofId: ProofId.ACCOUNT,
    });
    return tx ? fromDexieAccountTx(tx as DexieAccountTx) : undefined;
  }

  async getAccountTxs(userId: AccountId) {
    const txs = (await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()), proofId: ProofId.ACCOUNT })
      .reverse()
      .sortBy('settled')) as DexieAccountTx[];
    const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
    const settled = txs.filter(tx => tx.settled);
    return [...unsettled, ...settled].map(fromDexieAccountTx);
  }

  async settleAccountTx(txHash: TxHash, settled: Date) {
    await this.userTx
      .where({ txHash: new Uint8Array(txHash.toBuffer()), proofId: ProofId.ACCOUNT })
      .modify({ settled });
  }

  async addDefiTx(tx: UserDefiTx) {
    await this.userTx.put(toDexieDefiTx(tx));
  }

  async getDefiTx(txHash: TxHash) {
    const tx = await this.userTx.get({
      txHash: new Uint8Array(txHash.toBuffer()),
      proofId: ProofId.DEFI_DEPOSIT,
    });
    return tx ? fromDexieDefiTx(tx as DexieDefiTx) : undefined;
  }

  async getDefiTxs(userId: AccountId) {
    const txs = (await this.userTx
      .where({ userId: new Uint8Array(userId.toBuffer()), proofId: ProofId.DEFI_DEPOSIT })
      .reverse()
      .sortBy('settled')) as DexieDefiTx[];
    const unsettled = txs.filter(tx => !tx.settled).sort((a, b) => (a.created < b.created ? 1 : -1));
    const settled = txs.filter(tx => tx.settled);
    return [...unsettled, ...settled].map(fromDexieDefiTx);
  }

  async updateDefiTx(txHash: TxHash, outputValueA: bigint, outputValueB: bigint) {
    await this.userTx
      .where({ txHash: new Uint8Array(txHash.toBuffer()), proofId: ProofId.DEFI_DEPOSIT })
      .modify({ outputValueA, outputValueB });
  }

  async settleDefiTx(txHash: TxHash, settled: Date) {
    await this.userTx
      .where({ txHash: new Uint8Array(txHash.toBuffer()), proofId: ProofId.DEFI_DEPOSIT })
      .modify({ settled });
  }

  async isUserTxSettled(txHash: TxHash) {
    const txs = await this.userTx.where({ txHash: new Uint8Array(txHash.toBuffer()) }).toArray();
    return txs.length > 0 && txs.every(tx => tx.settled);
  }

  async removeUser(userId: AccountId) {
    const user = await this.getUser(userId);
    if (!user) return;

    const id = new Uint8Array(userId.toBuffer());
    await this.userTx.where({ userId: id }).delete();
    await this.userKeys.where({ accountId: id }).delete();
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

  async addUserSigningKey({ accountId, key, treeIndex }: SigningKey) {
    await this.userKeys.put(new DexieUserKey(new Uint8Array(accountId.toBuffer()), new Uint8Array(key), treeIndex));
  }

  async getUserSigningKeys(accountId: AccountId) {
    const userKeys = await this.userKeys.where({ accountId: new Uint8Array(accountId.toBuffer()) }).toArray();
    return userKeys.map(dexieUserKeyToSigningKey);
  }

  async getUserSigningKeyIndex(accountId: AccountId, signingKey: GrumpkinAddress) {
    const userKey = await this.userKeys.get({
      accountId: new Uint8Array(accountId.toBuffer()),
      key: new Uint8Array(signingKey.toBuffer().slice(0, 32)),
    });
    return userKey ? userKey.treeIndex : undefined;
  }

  async removeUserSigningKeys(accountId: AccountId) {
    await this.userKeys.where({ accountId: new Uint8Array(accountId.toBuffer()) }).delete();
  }

  async setAlias(alias: Alias) {
    return this.setAliases([alias]);
  }

  async setAliases(aliases: Alias[]) {
    const dbAliases = aliases.map(
      ({ aliasHash, address, latestNonce }) =>
        new DexieAlias(new Uint8Array(aliasHash.toBuffer()), new Uint8Array(address.toBuffer()), latestNonce),
    );
    await this.alias.bulkPut(dbAliases);
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
