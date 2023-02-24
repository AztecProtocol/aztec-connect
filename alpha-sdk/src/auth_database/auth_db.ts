import isNode from 'detect-node';
import { getLevelDb, LocalStorageDb } from '../key_value_database/index.js';
import { AuthDatabase } from './auth_database.js';

export function getAuthDb(memoryDb = false, identifier?: string) {
  const keyValueDb = isNode ? getLevelDb('aztec2-sdk-auth', memoryDb, identifier) : new LocalStorageDb();
  return new AuthDatabase(keyValueDb);
}
