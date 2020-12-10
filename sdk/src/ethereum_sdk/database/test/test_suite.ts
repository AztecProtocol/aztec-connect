import { randomAccount } from './fixtures';
import { Database, DbAccount } from '../database';

const sort = (arr: any[], sortBy: string) => arr.sort((a, b) => (a[sortBy] < b[sortBy] ? -1 : 1));

export const databaseTestSuite = (
  dbName: string,
  createDb: () => Promise<Database>,
  destroyDb: () => Promise<void>,
) => {
  describe(dbName, () => {
    let db: Database;

    beforeEach(async () => {
      db = await createDb();
      await db.init();
    });

    afterEach(async () => {
      await destroyDb();
    });

    it('add account to db and get it by eth address', async () => {
      const account0 = randomAccount();
      const account1 = randomAccount();
      await db.addAccount(account0);
      await db.addAccount(account1);

      const savedAccount0 = await db.getAccount(account0.ethAddress);
      expect(savedAccount0).toEqual(account0);

      const savedAccount1 = await db.getAccount(account1.ethAddress);
      expect(savedAccount1).toEqual(account1);
    });

    it('delete an account', async () => {
      const account0 = randomAccount();
      const account1 = randomAccount();
      await db.addAccount(account0);
      await db.addAccount(account1);

      await db.deleteAccount(account1.ethAddress);

      const savedAccount0 = await db.getAccount(account0.ethAddress);
      expect(savedAccount0).toEqual(account0);

      const savedAccount1 = await db.getAccount(account1.ethAddress);
      expect(savedAccount1).toBeUndefined();
    });

    it('get all accounts', async () => {
      const accounts: DbAccount[] = [];
      for (let i = 0; i < 5; ++i) {
        const account = randomAccount();
        await db.addAccount(account);

        if (i === 3) {
          await db.deleteAccount(account.ethAddress);
        } else {
          accounts.push(account);
        }
      }

      const savedAccounts = await db.getAccounts();
      expect(sort(savedAccounts, 'ethAddress')).toEqual(sort(accounts, 'ethAddress'));
    });
  });
};
