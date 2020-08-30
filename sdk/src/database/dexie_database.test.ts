import 'fake-indexeddb/auto';

import { DexieDatabase } from './dexie_database';
import { EthAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';

describe('dexie database', () => {
  it('should get all user signing keys', async () => {
    const db = new DexieDatabase();
    const owner = EthAddress.randomAddress();
    const key = randomBytes(32);
    await db.addUserSigningKey({ owner, key, treeIndex: 0 });
    const keys = await db.getUserSigningKeys(owner);
    expect(keys).toEqual([{ owner, key, treeIndex: 0 }]);
  });
});
