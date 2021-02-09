import { EthAddress } from 'barretenberg/address';
import { Connection, ConnectionOptions, Repository } from 'typeorm';
import { Database, DbAccount } from '../database';
import { AccountDao } from './account_dao';

export const getOrmConfig = (dbPath?: string): ConnectionOptions => ({
  name: 'aztec2-sdk-eth',
  type: 'sqlite',
  database: dbPath === ':memory:' ? dbPath : `${dbPath || '.'}/aztec2-sdk-eth.sqlite`,
  entities: [AccountDao],
  synchronize: true,
  logging: false,
});

export class SQLDatabase implements Database {
  private accountRep: Repository<AccountDao>;

  constructor(private connection: Connection) {
    this.accountRep = this.connection.getRepository(AccountDao);
  }

  async init() {}

  async close() {
    await this.connection.close();
  }

  async clear() {
    await this.connection.synchronize(true);
  }

  async setAccount(account: DbAccount) {
    await this.accountRep.save(account);
  }

  async getAccount(ethAddress: EthAddress) {
    return this.accountRep.findOne({ ethAddress });
  }

  async deleteAccount(ethAddress: EthAddress) {
    await this.accountRep.delete({ ethAddress });
  }
}
