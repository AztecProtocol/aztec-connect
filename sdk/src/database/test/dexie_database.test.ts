import 'fake-indexeddb/auto';

import { DexieDatabase } from '../dexie_database';
import { databaseTestSuite } from './test_suite';

let db: DexieDatabase;

const createDb = async () => {
  db = new DexieDatabase();
  return db;
};

const destroyDb = async () => {
  await db.clear();
  await db.close();
};

databaseTestSuite('DexieDatabase', createDb, destroyDb);
