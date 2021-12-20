import { EthAddress } from '@aztec/barretenberg/address';
import { Connection, ConnectionOptions, Repository } from 'typeorm';
import { Database, DbAccount } from '../database';
import { AccountDao } from './account_dao';

export const getOrmConfig = (memoryDb = false, identifier?: string): ConnectionOptions => {
  const folder = identifier ? `/${identifier}` : '';
  const dbPath = `./data${folder}`;
  const suffix = identifier ? `-${identifier}` : '';
  return {
    name: `aztec2-sdk-eth${suffix}`,
    type: 'sqlite',
    database: memoryDb ? ':memory:' : `${dbPath}/aztec2-sdk-eth.sqlite`,
    entities: [AccountDao],
    synchronize: true,
    logging: false,
  };
};

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
