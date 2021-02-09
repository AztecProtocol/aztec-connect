import { randomAccount } from './fixtures';
import { Database } from '../database';

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
      await db.setAccount(account0);
      await db.setAccount(account1);

      const savedAccount0 = await db.getAccount(account0.ethAddress);
      expect(savedAccount0).toEqual(account0);

      const savedAccount1 = await db.getAccount(account1.ethAddress);
      expect(savedAccount1).toEqual(account1);
    });

    it('delete an account', async () => {
      const account0 = randomAccount();
      const account1 = randomAccount();
      await db.setAccount(account0);
      await db.setAccount(account1);

      await db.deleteAccount(account1.ethAddress);

      const savedAccount0 = await db.getAccount(account0.ethAddress);
      expect(savedAccount0).toEqual(account0);

      const savedAccount1 = await db.getAccount(account1.ethAddress);
      expect(savedAccount1).toBeUndefined();
    });
  });
};
