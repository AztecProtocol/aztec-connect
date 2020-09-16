import 'fake-indexeddb/auto';

import { randomBytes } from 'crypto';
import { DexieDatabase } from './dexie_database';

describe('dexie database', () => {
  it('should get all user signing keys', async () => {
    const db = new DexieDatabase();
    const owner = randomBytes(64);
    const key = randomBytes(32);
    await db.addUserSigningKey({ owner, key, treeIndex: 0 });
    const keys = await db.getUserSigningKeys(owner);
    expect(keys).toEqual([{ owner, key, treeIndex: 0 }]);
  });
});
