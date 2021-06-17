import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import Dexie from 'dexie';
import { Database, DbAccount } from './database';

class DexieAccount {
  constructor(public ethAddress: Uint8Array, public accountPublicKey: Uint8Array) {}
}

const dexieAccountToDbAccount = ({ ethAddress, accountPublicKey }: DexieAccount): DbAccount => ({
  ethAddress: new EthAddress(Buffer.from(ethAddress)),
  accountPublicKey: new GrumpkinAddress(Buffer.from(accountPublicKey)),
});

export class DexieDatabase implements Database {
  private db!: Dexie;
  private user!: Dexie.Table<DexieAccount, Uint8Array>;

  constructor(private dbName = 'aztec2-sdk-eth', private version = 1) {}

  async init() {
    this.createTables();

    // If schemas changed, delete db.
    try {
      await this.getAccount(EthAddress.ZERO);
    } catch (e) {
      await this.db.delete();
      this.createTables();
    }
  }

  private createTables() {
    this.db = new Dexie(this.dbName);
    this.db.version(this.version).stores({
      user: '&ethAddress',
    });

    this.user = this.db.table('user');
    this.user.mapToClass(DexieAccount);
  }

  async clear() {
    for (const table of this.db.tables) {
      await table.clear();
    }
  }

  async close() {
    await this.db.close();
  }

  async setAccount({ ethAddress, accountPublicKey }: DbAccount) {
    await this.user.put(
      new DexieAccount(new Uint8Array(ethAddress.toBuffer()), new Uint8Array(accountPublicKey.toBuffer())),
    );
  }

  async getAccount(ethAddress: EthAddress) {
    const account = await this.user.get({ ethAddress: new Uint8Array(ethAddress.toBuffer()) });
    return account ? dexieAccountToDbAccount(account) : undefined;
  }

  async deleteAccount(ethAddress: EthAddress) {
    await this.user.delete(new Uint8Array(ethAddress.toBuffer()));
  }
}
