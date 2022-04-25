import { EthAddress, GrumpkinAddress } from '@aztec/sdk';
import createDebug from 'debug';
import Dexie from 'dexie';
import { EventEmitter } from 'events';
import { AccountVersion } from '../account_state';

const debug = createDebug('zm:user_database');

export enum DatabaseEvent {
  UPDATED_ACCOUNT = 'DATABASE_UPDATED_ACCOUNT',
}

export interface LinkedAccount {
  accountPublicKey: GrumpkinAddress;
  signerAddress: EthAddress;
  alias: string;
  version: AccountVersion;
  timestamp: Date;
}

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

export interface Database {
  on(event: DatabaseEvent.UPDATED_ACCOUNT, listener: () => void): this;
}

export class Database extends EventEmitter {
  private db!: Dexie;
  private linkedAccount!: Dexie.Table<DexieLinkedAccount, Uint8Array>;

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
      linkedAccount: '&accountPublicKey',
    });

    this.linkedAccount = this.db.table('linkedAccount');
    this.linkedAccount.mapToClass(DexieLinkedAccount);
  }

  async clear() {
    for (const table of this.db.tables) {
      await table.clear();
    }
  }

  async close() {
    await this.db?.close();
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
}
