import { AccountId, EthAddress, GrumpkinAddress, TxHash, UserJoinSplitTx } from '@aztec/sdk';
import Dexie from 'dexie';
import { AccountVersion } from '../account_state';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { AppAssetId } from '../assets';

const debug = createDebug('zm:user_database');

export enum DatabaseEvent {
  UPDATED_ACCOUNT = 'DATABASE_UPDATED_ACCOUNT',
  UPDATED_MIGRATING_TX = 'DATABASE_UPDATED_MIGRATING_TX',
}

export interface AccountV0 {
  accountPublicKey: GrumpkinAddress;
  alias: string;
  timestamp: Date;
}

export interface LinkedAccount {
  accountPublicKey: GrumpkinAddress;
  signerAddress: EthAddress;
  alias: string;
  version: AccountVersion;
  timestamp: Date;
}

class DexieAccountV0 {
  constructor(public accountPublicKey: Uint8Array, public alias: string, public timestamp: Date) {}
}

const fromDexieAccountV0 = ({ accountPublicKey, alias, timestamp }: DexieAccountV0): AccountV0 => ({
  accountPublicKey: new GrumpkinAddress(Buffer.from(accountPublicKey)),
  alias,
  timestamp,
});

class DexieLinkedAccount {
  constructor(
    public accountPublicKey: Uint8Array,
    public signerAddress: Uint8Array,
    public alias: string,
    public version: AccountVersion,
    public timestamp: Date,
  ) {}
}

const toDexieLinkedAccount = ({ accountPublicKey, signerAddress, alias, version, timestamp }: LinkedAccount) =>
  new DexieLinkedAccount(
    new Uint8Array(accountPublicKey.toBuffer()),
    new Uint8Array(signerAddress.toBuffer()),
    alias,
    version,
    timestamp,
  );

const fromDexieLinkedAccount = ({
  accountPublicKey,
  signerAddress,
  alias,
  version,
  timestamp,
}: DexieLinkedAccount): LinkedAccount => ({
  accountPublicKey: new GrumpkinAddress(Buffer.from(accountPublicKey)),
  signerAddress: new EthAddress(Buffer.from(signerAddress)),
  alias,
  version,
  timestamp,
});

class DexieMigratingTx {
  constructor(
    public txHash: Uint8Array,
    public userId: Uint8Array,
    public assetId: number,
    public publicInput: string,
    public publicOutput: string,
    public privateInput: string,
    public recipientPrivateOutput: string,
    public senderPrivateOutput: string,
    public ownedByUser: boolean,
    public created: number,
    public settled?: Date,
    public inputOwner?: Uint8Array,
    public outputOwner?: Uint8Array,
  ) {}
}

const toDexieMigratingTx = (tx: UserJoinSplitTx) =>
  new DexieMigratingTx(
    new Uint8Array(tx.txHash.toBuffer()),
    new Uint8Array(tx.userId.toBuffer()),
    tx.assetId,
    tx.publicInput.toString(),
    tx.publicOutput.toString(),
    tx.privateInput.toString(),
    tx.recipientPrivateOutput.toString(),
    tx.senderPrivateOutput.toString(),
    tx.ownedByUser,
    tx.created.getTime(),
    tx.settled,
    tx.inputOwner ? new Uint8Array(tx.inputOwner.toBuffer()) : undefined,
    tx.outputOwner ? new Uint8Array(tx.outputOwner.toBuffer()) : undefined,
  );

const fromDexieMigratingTx = ({
  txHash,
  userId,
  publicInput,
  publicOutput,
  privateInput,
  recipientPrivateOutput,
  senderPrivateOutput,
  created,
  inputOwner,
  outputOwner,
  assetId,
  ownedByUser,
  settled,
}: DexieMigratingTx) =>
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
    new Date(created),
    settled,
  );

export interface Database {
  on(event: DatabaseEvent.UPDATED_ACCOUNT, listener: () => void): this;
  on(event: DatabaseEvent.UPDATED_MIGRATING_TX, listener: (assetId?: AppAssetId) => void): this;
}

export class Database extends EventEmitter {
  private db!: Dexie;
  private accountV0!: Dexie.Table<DexieAccountV0, Uint8Array>; // To be deprecated.
  private linkedAccount!: Dexie.Table<DexieLinkedAccount, Uint8Array>;
  private migratingTx!: Dexie.Table<DexieMigratingTx, Uint8Array>;

  constructor(private dbName = 'zk-money', private version = 2) {
    super();
  }

  get isOpen() {
    return this.db?.isOpen();
  }

  async open() {
    this.createTables();

    try {
      await this.getAccounts();
    } catch (e) {
      debug('Clear entire database due to significant schema changes.');
      await this.db.delete();
      this.createTables();
    }
  }

  private createTables() {
    this.db = new Dexie(this.dbName);
    this.db.version(this.version).stores({
      account: '&accountPublicKey',
      linkedAccount: '&accountPublicKey',
      migratingTx: '&txHash, userId',
    });

    this.accountV0 = this.db.table('account');
    this.accountV0.mapToClass(DexieAccountV0);
    this.linkedAccount = this.db.table('linkedAccount');
    this.linkedAccount.mapToClass(DexieLinkedAccount);
    this.migratingTx = this.db.table('migratingTx');
    this.migratingTx.mapToClass(DexieMigratingTx);
  }

  async clear() {
    for (const table of this.db.tables) {
      await table.clear();
    }
  }

  async close() {
    await this.db?.close();
  }

  async getAccountV0(accountPublicKey: GrumpkinAddress) {
    const account = await this.accountV0.get({ accountPublicKey: new Uint8Array(accountPublicKey.toBuffer()) });
    return account ? fromDexieAccountV0(account) : undefined;
  }

  async getAccountV0s() {
    const accounts = await this.accountV0.toArray();
    return accounts.map(fromDexieAccountV0);
  }

  async deleteAccountV0(accountPublicKey: GrumpkinAddress) {
    await this.accountV0.delete(new Uint8Array(accountPublicKey.toBuffer()));
  }

  async deleteAccountV0s() {
    await this.accountV0.clear();
  }

  async addAccount(account: LinkedAccount) {
    await this.linkedAccount.put(toDexieLinkedAccount(account));
    this.emit(DatabaseEvent.UPDATED_ACCOUNT);
  }

  async getAccount(accountPublicKey: GrumpkinAddress) {
    const linkedAccount = await this.linkedAccount.get({
      accountPublicKey: new Uint8Array(accountPublicKey.toBuffer()),
    });
    return linkedAccount ? fromDexieLinkedAccount(linkedAccount) : undefined;
  }

  async getAccounts() {
    const linkedAccounts = await this.linkedAccount.toArray();
    return linkedAccounts.map(fromDexieLinkedAccount);
  }

  async deleteAccount(accountPublicKey: GrumpkinAddress) {
    await this.linkedAccount.delete(new Uint8Array(accountPublicKey.toBuffer()));
    this.emit(DatabaseEvent.UPDATED_ACCOUNT);
  }

  async addMigratingTx(tx: UserJoinSplitTx) {
    await this.migratingTx.put(toDexieMigratingTx({ ...tx, ownedByUser: false }));
    this.emit(DatabaseEvent.UPDATED_MIGRATING_TX, tx.assetId);
  }

  async getMigratingTxs(userId: AccountId) {
    return (
      await this.migratingTx
        .where({ userId: new Uint8Array(userId.toBuffer()) })
        .reverse()
        .sortBy('created')
    ).map(fromDexieMigratingTx);
  }

  async removeMigratingTx(txHash: TxHash) {
    await this.migratingTx.where({ txHash: new Uint8Array(txHash.toBuffer()) }).delete();
    this.emit(DatabaseEvent.UPDATED_MIGRATING_TX);
  }
}
