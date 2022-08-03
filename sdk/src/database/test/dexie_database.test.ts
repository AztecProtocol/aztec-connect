import { randomBytes } from '@aztec/barretenberg/crypto';
import 'fake-indexeddb/auto';

import { DexieDatabase } from '../dexie_database';
import { databaseTestSuite } from './test_suite';

let db: DexieDatabase;

const createDb = () => {
  db = new DexieDatabase();
  return Promise.resolve(db);
};

const destroyDb = async () => {
  await db.clear();
  await db.close();
};

databaseTestSuite('DexieDatabase', createDb, destroyDb);

describe('dexie database', () => {
  beforeEach(async () => {
    await createDb();
  });

  afterEach(async () => {
    await destroyDb();
  });

  describe('Key', () => {
    const MAX_BYTE_LENGTH = 240;

    it('add, get and delete large key', async () => {
      const name = 'largeKey';
      const value = randomBytes(1000);
      await db.addKey(name, value, MAX_BYTE_LENGTH);

      expect(await db.getKey(name)).toEqual(value);

      await db.deleteKey(name);

      expect(await db.getKey(name)).toBeUndefined();
    });

    it('override existing large key', async () => {
      const name = 'largeKey';

      {
        const value = randomBytes(1000);
        await db.addKey(name, value, MAX_BYTE_LENGTH);
        expect(await db.getKey(name)).toEqual(value);
      }

      {
        const value = randomBytes(1200);
        await db.addKey(name, value, MAX_BYTE_LENGTH);
        expect(await db.getKey(name)).toEqual(value);
      }

      {
        const value = randomBytes(480);
        await db.addKey(name, value, MAX_BYTE_LENGTH);
        expect(await db.getKey(name)).toEqual(value);
      }
    });
  });
});
