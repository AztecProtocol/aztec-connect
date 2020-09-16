import { EthAddress } from 'barretenberg/address';
import Dexie from 'dexie';

export interface DbAccount {
  ethAddress: EthAddress;
  userId: Buffer;
}

class DexieAccount {
  constructor(public ethAddress: Uint8Array, public userId: Uint8Array) {}
}

const dexieAccountToDbAccount = ({ ethAddress, userId }: DexieAccount): DbAccount => ({
  ethAddress: new EthAddress(Buffer.from(ethAddress)),
  userId: Buffer.from(userId),
});

export class Database {
  private db: Dexie;
  private user: Dexie.Table<DexieAccount, Uint8Array>;

  constructor(name: string) {
    this.db = new Dexie(name);
    this.db.version(1).stores({
      user: '&ethAddress',
    });

    this.user = this.db.table('user');
    this.user.mapToClass(DexieAccount);
  }

  close() {
    this.db.close();
  }

  async clear() {
    await this.user.clear();
  }

  async addAccount({ ethAddress, userId }: DbAccount) {
    await this.user.add(new DexieAccount(new Uint8Array(ethAddress.toBuffer()), new Uint8Array(userId)));
  }

  async getAccount(ethAddress: EthAddress) {
    const account = await this.user.get(new Uint8Array(ethAddress.toBuffer()));
    return account ? dexieAccountToDbAccount(account) : undefined;
  }

  async getAccounts() {
    const users = await this.user.toArray();
    return users.map(dexieAccountToDbAccount);
  }

  async deleteAccount(ethAddress: EthAddress) {
    await this.user.delete(new Uint8Array(ethAddress.toBuffer()));
  }
}
