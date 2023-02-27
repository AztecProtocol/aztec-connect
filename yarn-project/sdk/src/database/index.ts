import isNode from 'detect-node';
import { DexieDatabase } from './dexie_database.js';
import { SQLDatabase } from './node/index.js';

export * from './database.js';

export async function getDb(memoryDb = false, identifier?: string) {
  if (isNode) {
    return await SQLDatabase.getDb(memoryDb, identifier);
  } else {
    const db = new DexieDatabase();
    await db.open();
    return db;
  }
}
