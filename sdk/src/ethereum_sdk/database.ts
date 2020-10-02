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

class DexieMap {
  constructor(public key: string, public value: Uint8Array) {}
}

export class Database {
  private db: Dexie;
  private user: Dexie.Table<DexieAccount, Uint8Array>;
  private map: Dexie.Table<DexieMap, string>;

  constructor() {
    this.db = new Dexie('aztec2-sdk-eth');
    this.db.version(1).stores({
      user: '&ethAddress',
      map: '&key',
    });

    this.user = this.db.table('user');
    this.user.mapToClass(DexieAccount);
    this.map = this.db.table('map');
    this.map.mapToClass(DexieMap);
  }

  static async clear() {
    const db = new Dexie('aztec2-sdk-eth');
    await db.delete();
  }

  async clear() {
    for (const table of this.db.tables) {
      await table.clear();
    }
  }

  close() {
    this.db.close();
  }

  async addAccount({ ethAddress, userId }: DbAccount) {
    await this.user.put(new DexieAccount(new Uint8Array(ethAddress.toBuffer()), new Uint8Array(userId)));
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

  async addValue(key: string, value: Buffer) {
    await this.map.put(new DexieMap(key, new Uint8Array(value)));
  }

  async getValue(key: string) {
    const map = await this.map.get(key);
    return map ? Buffer.from(map.value) : undefined;
  }

  async deleteValue(key: string) {
    await this.map.delete(key);
  }
}
