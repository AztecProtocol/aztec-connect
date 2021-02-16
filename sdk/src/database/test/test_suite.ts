import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/tx_hash';
import { randomBytes } from 'crypto';
import { Note } from '../../note';
import { UserData, AccountId } from '../../user';
import { UserAccountTx, UserJoinSplitTx } from '../../user_tx';
import { Database, SigningKey } from '../database';
import {
  randomAlias,
  randomNote,
  randomSigningKey,
  randomUser,
  randomUserAccountTx,
  randomUserJoinSplitTx,
} from './fixtures';

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

    describe('Note', () => {
      it('add note to db and get note by index', async () => {
        const note = randomNote();
        await db.addNote(note);

        const savedNote = await db.getNote(note.index);
        expect(savedNote).toEqual(note);
      });

      it('get note by nullifier', async () => {
        const note0 = randomNote();
        const note1 = randomNote();
        await db.addNote(note0);
        await db.addNote(note1);
        expect(await db.getNoteByNullifier(note0.nullifier)).toEqual(note0);
        expect(await db.getNoteByNullifier(note1.nullifier)).toEqual(note1);
        expect(await db.getNoteByNullifier(randomBytes(32))).toBeUndefined();
      });

      it('can nullify a note', async () => {
        const note = randomNote();
        await db.addNote(note);

        const savedNote = await db.getNote(note.index);
        expect(savedNote!.nullified).toBe(false);

        await db.nullifyNote(note.index);

        const updatedNote = await db.getNote(note.index);
        expect(updatedNote!.nullified).toBe(true);
      });

      it('get all notes belonging to a user that are not nullified', async () => {
        const userId = AccountId.random();
        const userNotes: Note[] = [];
        for (let i = 0; i < 5; ++i) {
          const note = randomNote();
          note.owner = userId;
          await db.addNote(note);
          if (i % 2) {
            await db.nullifyNote(note.index);
          } else {
            userNotes.push(note);
          }
        }
        for (let i = 0; i < 5; ++i) {
          const note = randomNote();
          note.owner = AccountId.random();
          await db.addNote(note);
        }

        const savedNotes = await db.getUserNotes(userId);
        expect(savedNotes).toEqual(sort(userNotes, 'index'));
      });
    });

    describe('User', () => {
      it('add user to db and get user by id', async () => {
        const user = randomUser();
        await db.addUser(user);

        const savedUser = await db.getUser(user.id);
        expect(savedUser).toEqual(user);
      });

      it('get all users', async () => {
        const users: UserData[] = [];
        for (let i = 0; i < 5; ++i) {
          const user = randomUser();
          await db.addUser(user);
          users.push(user);
        }
        const savedUsers = await db.getUsers();
        expect(sort(savedUsers, 'id')).toEqual(sort(users, 'id'));
      });

      it('update data for an existing user', async () => {
        const user = randomUser();
        await db.addUser(user);

        const newUser = { ...user, syncedToRollup: user.syncedToRollup + 1 };
        await db.updateUser(newUser);

        const updatedUser = await db.getUser(user.id);
        expect(updatedUser).toEqual(newUser);
      });

      it('ignore if try to update a non existent user', async () => {
        const user = randomUser();
        await db.addUser(user);

        const newUser = { ...user, id: AccountId.random() };
        await db.updateUser(newUser);

        const oldUser = await db.getUser(user.id);
        expect(oldUser).toEqual(user);

        const updatedUser = await db.getUser(newUser.id);
        expect(updatedUser).toBeUndefined();
      });
    });

    describe('JoinSplitTx', () => {
      it('add join split tx to db and get it by user id and tx hash', async () => {
        const tx = randomUserJoinSplitTx();
        await db.addJoinSplitTx(tx);

        const newUserId = AccountId.random();
        const sharedTx = { ...tx, userId: newUserId };
        await db.addJoinSplitTx(sharedTx);

        const savedTx = await db.getJoinSplitTx(tx.userId, tx.txHash);
        expect(savedTx).toEqual(tx);

        const newTx = await db.getJoinSplitTx(newUserId, tx.txHash);
        expect(newTx).toEqual(sharedTx);
      });

      it('will override old data if try to add a user tx with the same user id and tx hash combination', async () => {
        const tx = randomUserJoinSplitTx();
        await db.addJoinSplitTx(tx);

        const newTx = randomUserJoinSplitTx();
        newTx.userId = tx.userId;
        newTx.txHash = tx.txHash;
        await db.addJoinSplitTx(newTx);

        const savedTx = await db.getJoinSplitTx(tx.userId, tx.txHash);
        expect(savedTx).toEqual(newTx);
      });

      it('settle all user txs with the same tx hash', async () => {
        const tx = randomUserJoinSplitTx();

        const userId0 = AccountId.random();
        await db.addJoinSplitTx({ ...tx, userId: userId0 });

        const userId1 = AccountId.random();
        await db.addJoinSplitTx({ ...tx, userId: userId1 });

        const settled = new Date();
        await db.settleJoinSplitTx(tx.txHash, settled);

        const tx0 = await db.getJoinSplitTx(userId0, tx.txHash);
        expect(tx0!.settled).toEqual(settled);

        const tx1 = await db.getJoinSplitTx(userId1, tx.txHash);
        expect(tx1!.settled).toEqual(settled);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const userId0 = AccountId.random();
        const userId1 = AccountId.random();
        const settledTxs0: UserJoinSplitTx[] = [];
        const settledTxs1: UserJoinSplitTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomUserJoinSplitTx();
          tx0.userId = userId0;
          tx0.settled = new Date(now + i);
          await db.addJoinSplitTx(tx0);
          settledTxs0.push(tx0);

          const tx1 = randomUserJoinSplitTx();
          tx1.userId = userId1;
          tx1.settled = new Date(now - i);
          await db.addJoinSplitTx(tx1);
          settledTxs1.push(tx1);
        }

        expect(await db.getJoinSplitTxs(userId0)).toEqual([...settledTxs0].reverse());
        expect(await db.getJoinSplitTxs(userId1)).toEqual(settledTxs1);

        const unsettledTxs0: UserJoinSplitTx[] = [];
        const unsettledTxs1: UserJoinSplitTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomUserJoinSplitTx();
          tx0.userId = userId0;
          tx0.created = new Date(now - i);
          await db.addJoinSplitTx(tx0);
          unsettledTxs0.push(tx0);

          const tx1 = randomUserJoinSplitTx();
          tx1.userId = userId1;
          tx1.created = new Date(now + i);
          await db.addJoinSplitTx(tx1);
          unsettledTxs1.push(tx1);
        }

        expect(await db.getJoinSplitTxs(userId0)).toEqual(unsettledTxs0.concat([...settledTxs0].reverse()));
        expect(await db.getJoinSplitTxs(userId1)).toEqual([...unsettledTxs1].reverse().concat(settledTxs1));
      });

      it('get all txs with the same tx hash', async () => {
        const txs: UserJoinSplitTx[] = [];
        const txHash = TxHash.random();
        for (let i = 0; i < 5; ++i) {
          const tx = randomUserJoinSplitTx();
          tx.txHash = txHash;
          await db.addJoinSplitTx(tx);
          txs.push(tx);
        }
        for (let i = 0; i < 3; ++i) {
          const tx = randomUserJoinSplitTx();
          await db.addJoinSplitTx(tx);
        }

        const savedTxs = await db.getJoinSplitTxsByTxHash(txHash);
        expect(savedTxs.length).toEqual(txs.length);
        expect(savedTxs).toEqual(expect.arrayContaining(txs));
      });
    });

    describe('AccountTx', () => {
      it('add account tx to db and get it by tx hash', async () => {
        const tx0 = randomUserAccountTx();
        await db.addAccountTx(tx0);

        const tx1 = randomUserAccountTx();
        await db.addAccountTx(tx1);

        expect(await db.getAccountTx(tx0.txHash)).toEqual(tx0);
        expect(await db.getAccountTx(tx1.txHash)).toEqual(tx1);
      });

      it('will override old data if try to add an account tx with existing tx hash', async () => {
        const tx = randomUserAccountTx();
        await db.addAccountTx(tx);

        const newTx = randomUserAccountTx();
        newTx.txHash = tx.txHash;
        await db.addAccountTx(newTx);

        const savedTx = await db.getAccountTx(tx.txHash);
        expect(savedTx).toEqual(newTx);
      });

      it('settle an account tx with a specific tx hash', async () => {
        const tx0 = randomUserAccountTx();
        const tx1 = randomUserAccountTx();
        await db.addAccountTx(tx0);
        await db.addAccountTx(tx1);

        const settled = new Date();
        await db.settleAccountTx(tx1.txHash, settled);

        const savedTx0 = await db.getAccountTx(tx0.txHash);
        expect(savedTx0!.settled).toBeFalsy();

        const savedTx1 = await db.getAccountTx(tx1.txHash);
        expect(savedTx1!.settled).toEqual(settled);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const userId = AccountId.random();
        const txs: UserAccountTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx = randomUserAccountTx();
          tx.userId = userId;
          tx.created = new Date(now + i);
          tx.settled = new Date(now + i);
          await db.addAccountTx(tx);
          txs.push(tx);

          const tx2 = randomUserAccountTx();
          await db.addAccountTx(tx2);
        }

        expect(await db.getAccountTxs(userId)).toEqual([...txs].reverse());

        const unsettledTxs0: UserAccountTx[] = [];
        const unsettledTxs1: UserAccountTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx = randomUserAccountTx();
          tx.userId = userId;
          tx.created = new Date(now - i);
          await db.addAccountTx(tx);
          unsettledTxs0.push(tx);
        }
        for (let i = 0; i < 5; ++i) {
          const tx = randomUserAccountTx();
          tx.userId = userId;
          tx.created = new Date(now + unsettledTxs0.length + i);
          await db.addAccountTx(tx);
          unsettledTxs1.push(tx);
        }

        expect(await db.getAccountTxs(userId)).toEqual([
          ...unsettledTxs1.reverse(),
          ...unsettledTxs0,
          ...txs.reverse(),
        ]);
      });
    });

    describe('UserKey', () => {
      it('add signing key and get all keys for a user', async () => {
        const accountId = AccountId.random();
        const userKeys: SigningKey[] = [];
        for (let i = 0; i < 3; ++i) {
          const signingKey = randomSigningKey();
          signingKey.accountId = accountId;
          await db.addUserSigningKey(signingKey);
          userKeys.push(signingKey);
        }
        for (let i = 0; i < 5; ++i) {
          const signingKey = randomSigningKey();
          await db.addUserSigningKey(signingKey);
        }

        const savedUserKeys = await db.getUserSigningKeys(accountId);
        expect(sort(savedUserKeys, 'key')).toEqual(sort(userKeys, 'key'));
      });

      it('override the existing data when adding signing keys with the same accountAliasId and key', async () => {
        const accountId = AccountId.random();
        const key1 = randomSigningKey();
        key1.accountId = accountId;

        await db.addUserSigningKey(key1);
        expect(await db.getUserSigningKeys(accountId)).toEqual([key1]);

        const key2 = { ...key1, treeIndex: key1.treeIndex + 1 };
        await db.addUserSigningKey(key2);
        expect(await db.getUserSigningKeys(accountId)).toEqual([key2]);

        const key3 = { ...key1, accountId: AccountId.random() };
        await db.addUserSigningKey(key3);
        expect(await db.getUserSigningKeys(accountId)).toEqual([key2]);

        const key4 = { ...key1, key: randomBytes(32) };
        await db.addUserSigningKey(key4);
        expect(sort(await db.getUserSigningKeys(accountId), 'key')).toEqual(sort([key2, key4], 'key'));
      });

      it('remove all signing keys of given account id', async () => {
        const generateAccountSigningKeys = async (accountId: AccountId, numKeys = 3) => {
          const keys: SigningKey[] = [];
          for (let i = 0; i < numKeys; ++i) {
            const signingKey = randomSigningKey();
            signingKey.accountId = accountId;
            await db.addUserSigningKey(signingKey);
            keys.push(signingKey);
          }
          return keys;
        };

        const accountId0 = AccountId.random();
        const accountId1 = AccountId.random();
        const keys0 = await generateAccountSigningKeys(accountId0);
        const keys1 = await generateAccountSigningKeys(accountId1);

        const savedSigningKeys0 = await db.getUserSigningKeys(accountId0);
        expect(sort(savedSigningKeys0, 'key')).toEqual(sort(keys0, 'key'));

        await db.removeUserSigningKeys(accountId0);

        expect(await db.getUserSigningKeys(accountId0)).toEqual([]);

        const savedSigningKeys1 = await db.getUserSigningKeys(accountId1);
        expect(sort(savedSigningKeys1, 'key')).toEqual(sort(keys1, 'key'));
      });

      it('get the index of a signing key', async () => {
        const accountId = AccountId.random();
        const signingKey = randomSigningKey();
        signingKey.accountId = accountId;
        await db.addUserSigningKey(signingKey);

        const fullKey = new GrumpkinAddress(Buffer.concat([signingKey.key, randomBytes(32)]));
        const index0 = await db.getUserSigningKeyIndex(accountId, fullKey);
        expect(index0).toEqual(signingKey.treeIndex);

        const index1 = await db.getUserSigningKeyIndex(AccountId.random(), fullKey);
        expect(index1).toBeUndefined();
      });
    });

    describe('Alias', () => {
      it('save alias and its address and nonce', async () => {
        const alias0 = randomAlias();
        await db.setAlias(alias0);
        const alias1 = randomAlias();
        await db.setAlias(alias1);
        const alias2 = { ...alias0, address: GrumpkinAddress.randomAddress(), latestNonce: alias0.latestNonce + 1 };
        await db.setAlias(alias2);

        const savedAlias0 = await db.getAlias(alias0.aliasHash, alias0.address);
        expect(savedAlias0).toEqual(alias0);

        const savedAlias2 = await db.getAlias(alias2.aliasHash, alias2.address);
        expect(savedAlias2).toEqual(alias2);

        const savedAliases0 = await db.getAliases(alias0.aliasHash);
        expect(sort(savedAliases0, 'latestNonce')).toEqual(sort([alias0, alias2], 'latestNonce'));

        const savedAliases1 = await db.getAliases(alias1.aliasHash);
        expect(savedAliases1).toEqual([alias1]);

        const emptyAliases = await db.getAliases(AliasHash.random());
        expect(emptyAliases).toEqual([]);
      });

      it('update alias with the same aliasHash and address pair', async () => {
        const alias1 = randomAlias();
        await db.setAlias(alias1);

        const alias2 = { ...alias1, aliasHash: AliasHash.random() };
        await db.setAlias(alias2);

        const updatedAlias = { ...alias1, latestNonce: alias1.latestNonce + 1 };

        await db.setAlias(updatedAlias);

        const savedAliases1 = await db.getAliases(alias1.aliasHash);
        expect(savedAliases1).toEqual([updatedAlias]);

        const savedAliases2 = await db.getAliases(alias2.aliasHash);
        expect(savedAliases2).toEqual([alias2]);
      });

      it('get the largest nonce by public key', async () => {
        const address1 = GrumpkinAddress.randomAddress();
        const address2 = GrumpkinAddress.randomAddress();
        for (let i = 0; i < 3; ++i) {
          const alias = randomAlias();
          alias.address = address1;
          alias.latestNonce = i;
          await db.setAlias(alias);

          alias.address = address2;
          alias.latestNonce = 10 - i;
          await db.setAlias(alias);
        }

        expect(await db.getLatestNonceByAddress(address1)).toBe(2);
        expect(await db.getLatestNonceByAddress(address2)).toBe(10);
      });

      it('get the largest nonce by alias hash', async () => {
        const aliasHash1 = AliasHash.random();
        const aliasHash2 = AliasHash.random();
        for (let i = 0; i < 3; ++i) {
          const alias = randomAlias();
          alias.aliasHash = aliasHash1;
          alias.latestNonce = i;
          await db.setAlias(alias);

          alias.aliasHash = aliasHash2;
          alias.latestNonce = 10 - i;
          await db.setAlias(alias);
        }

        expect(await db.getLatestNonceByAliasHash(aliasHash1)).toBe(2);
        expect(await db.getLatestNonceByAliasHash(aliasHash2)).toBe(10);
      });

      it('get alias hash by public key and an optional nonce', async () => {
        const alias = randomAlias();
        const aliasHashes: AliasHash[] = [];
        for (let i = 0; i < 3; ++i) {
          alias.latestNonce = 10 - i * 2;
          alias.aliasHash = AliasHash.random();
          aliasHashes.push(alias.aliasHash);
          await db.setAlias(alias);
        }

        expect(await db.getAliasHashByAddress(alias.address)).toEqual(aliasHashes[0]);
        expect(await db.getAliasHashByAddress(alias.address, 0)).toEqual(aliasHashes[2]);
        expect(await db.getAliasHashByAddress(alias.address, 5)).toEqual(aliasHashes[2]);
        expect(await db.getAliasHashByAddress(alias.address, 6)).toEqual(aliasHashes[2]);
        expect(await db.getAliasHashByAddress(alias.address, 7)).toEqual(aliasHashes[1]);
        expect(await db.getAliasHashByAddress(alias.address, 8)).toEqual(aliasHashes[1]);
      });

      it('get public key by alias hash and an optional nonce', async () => {
        const alias = randomAlias();
        const publicKeys: GrumpkinAddress[] = [];
        for (let i = 0; i < 3; ++i) {
          alias.latestNonce = 10 - i * 2;
          alias.address = GrumpkinAddress.randomAddress();
          publicKeys.push(alias.address);
          await db.setAlias(alias);
        }

        expect(await db.getAddressByAliasHash(alias.aliasHash)).toEqual(publicKeys[0]);
        expect(await db.getAddressByAliasHash(alias.aliasHash, 0)).toEqual(publicKeys[2]);
        expect(await db.getAddressByAliasHash(alias.aliasHash, 5)).toEqual(publicKeys[2]);
        expect(await db.getAddressByAliasHash(alias.aliasHash, 6)).toEqual(publicKeys[2]);
        expect(await db.getAddressByAliasHash(alias.aliasHash, 7)).toEqual(publicKeys[1]);
        expect(await db.getAddressByAliasHash(alias.aliasHash, 8)).toEqual(publicKeys[1]);
      });
    });

    describe('Key', () => {
      it('add, get and delete key', async () => {
        const name = 'secretKey';
        const key = randomBytes(1000);
        await db.addKey(name, key);

        expect(await db.getKey(name)).toEqual(key);

        await db.deleteKey(name);

        expect(await db.getKey(name)).toBeUndefined();
      });
    });

    describe('Reset and Cleanup', () => {
      const generateUserProfile = async (user: UserData) => {
        await db.addUser(user);

        const note = randomNote();
        note.owner = user.id;
        await db.addNote(note);

        const signingKey = randomSigningKey();
        signingKey.accountId = user.id;
        await db.addUserSigningKey(signingKey);

        const joinSplitTx = randomUserJoinSplitTx();
        joinSplitTx.userId = user.id;
        await db.addJoinSplitTx(joinSplitTx);

        const accountTx = randomUserAccountTx();
        accountTx.userId = user.id;
        await db.addAccountTx(accountTx);

        return { user, note, signingKey, joinSplitTx, accountTx };
      };

      it('remove all data of a user', async () => {
        const user0 = randomUser();
        const user1 = randomUser();
        const profile0 = await generateUserProfile(user0);
        const profile1 = await generateUserProfile(user1);

        await db.removeUser(user0.id);

        expect(await db.getUser(user0.id)).toBeUndefined();
        expect(await db.getUserNotes(user0.id)).toEqual([]);
        expect(await db.getNote(profile0.note.index)).toBeUndefined();
        expect(await db.getUserSigningKeys(user0.id)).toEqual([]);
        expect(await db.getJoinSplitTxs(user0.id)).toEqual([]);
        expect(await db.getAccountTxs(user0.id)).toEqual([]);

        expect(await db.getUser(user1.id)).toEqual(profile1.user);
        expect(await db.getUserNotes(user1.id)).toEqual([profile1.note]);
        expect(await db.getNote(profile1.note.index)).toEqual(profile1.note);
        expect(await db.getUserSigningKeys(user1.id)).toEqual([profile1.signingKey]);
        expect(await db.getJoinSplitTxs(user1.id)).toEqual([profile1.joinSplitTx]);
        expect(await db.getAccountTxs(user1.id)).toEqual([profile1.accountTx]);
      });

      it('keep data of other users with same alias and publicKey but different nonces', async () => {
        const user0 = randomUser();
        const user1 = { ...user0, id: new AccountId(user0.publicKey, user0.nonce + 1), nonce: user0.nonce + 1 };
        const profile0 = await generateUserProfile(user0);
        const profile1 = await generateUserProfile(user1);

        await db.removeUser(user0.id);

        expect(await db.getUser(user0.id)).toBeUndefined();
        expect(await db.getUserNotes(user0.id)).toEqual([]);
        expect(await db.getNote(profile0.note.index)).toBeUndefined();
        expect(await db.getUserSigningKeys(user0.id)).toEqual([]);
        expect(await db.getJoinSplitTxs(user0.id)).toEqual([]);
        expect(await db.getAccountTxs(user0.id)).toEqual([]);

        expect(await db.getUser(user1.id)).toEqual(profile1.user);
        expect(await db.getUserNotes(user1.id)).toEqual([profile1.note]);
        expect(await db.getNote(profile1.note.index)).toEqual(profile1.note);
        expect(await db.getUserSigningKeys(user1.id)).toEqual([profile1.signingKey]);
        expect(await db.getJoinSplitTxs(user1.id)).toEqual([profile1.joinSplitTx]);
        expect(await db.getAccountTxs(user1.id)).toEqual([profile1.accountTx]);
      });

      it('can reset user related data', async () => {
        const alias = randomAlias();
        await db.setAlias(alias);

        const note = randomNote();
        await db.addNote(note);

        const user = randomUser();
        await db.addUser(user);

        const keyName = 'secretKey';
        const key = randomBytes(1000);
        await db.addKey(keyName, key);

        const signingKey = randomSigningKey();
        const fullKey = new GrumpkinAddress(Buffer.concat([signingKey.key, randomBytes(32)]));
        await db.addUserSigningKey(signingKey);

        const tx = randomUserJoinSplitTx();
        await db.addJoinSplitTx(tx);

        await db.resetUsers();

        expect(await db.getAliases(alias.aliasHash)).toEqual([]);
        expect(await db.getNote(note.index)).toBeUndefined();
        expect(await db.getUserSigningKeyIndex(signingKey.accountId, fullKey)).toBeUndefined();
        expect(await db.getJoinSplitTx(tx.userId, tx.txHash)).toBeUndefined();

        expect(await db.getUser(user.id)).toEqual({
          ...user,
          syncedToRollup: -1,
        });

        expect(await db.getKey(keyName)).toEqual(key);
      });

      it('can clear all tables', async () => {
        const alias = randomAlias();
        await db.setAlias(alias);

        const note = randomNote();
        await db.addNote(note);

        const user = randomUser();
        await db.addUser(user);

        const keyName = 'secretKey';
        const key = randomBytes(1000);
        await db.addKey(keyName, key);

        const signingKey = randomSigningKey();
        const fullKey = new GrumpkinAddress(Buffer.concat([signingKey.key, randomBytes(32)]));
        await db.addUserSigningKey(signingKey);

        const tx = randomUserJoinSplitTx();
        await db.addJoinSplitTx(tx);

        await db.clear();

        expect(await db.getAliases(alias.aliasHash)).toEqual([]);
        expect(await db.getNote(note.index)).toBeUndefined();
        expect(await db.getUser(user.id)).toBeUndefined();
        expect(await db.getKey(keyName)).toBeUndefined();
        expect(await db.getUserSigningKeyIndex(signingKey.accountId, fullKey)).toBeUndefined();
        expect(await db.getJoinSplitTx(tx.userId, tx.txHash)).toBeUndefined();
      });
    });
  });
};
