import { GrumpkinAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';
import { Note } from '../../note';
import { UserData } from '../../user';
import { UserTx } from '../../user_tx';
import { Database, SigningKey } from '../database';
import { randomNote, randomSigningKey, randomUser, randomUserTx } from './fixtures';

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
    });

    afterEach(async () => {
      await destroyDb();
    });

    it('add note to db and get note by index', async () => {
      const note = randomNote();
      await db.addNote(note);

      const savedNote = await db.getNote(note.index);
      expect(savedNote).toEqual(note);
    });

    it('get note by nullifier and user id', async () => {
      const note = randomNote();
      await db.addNote(note);
      const savedNote = await db.getNoteByNullifier(note.owner, note.nullifier);
      expect(savedNote).toEqual(note);

      const randomUserId = randomBytes(32);
      const emptyNote = await db.getNoteByNullifier(randomUserId, note.nullifier);
      expect(emptyNote).toBeUndefined();
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
      const userId = randomBytes(32);
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
        note.owner = randomBytes(32);
        await db.addNote(note);
      }

      const savedNotes = await db.getUserNotes(userId);
      expect(savedNotes).toEqual(sort(userNotes, 'index'));
    });

    it('add user to db and get user by id', async () => {
      const user = randomUser();
      await db.addUser(user);

      const savedUser = await db.getUser(user.id);
      expect(savedUser).toEqual(user);
    });

    it('get user by private key', async () => {
      const user = randomUser();
      await db.addUser(user);

      const savedUser = await db.getUserByPrivateKey(user.privateKey);
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

      const newUser = { ...user, id: randomBytes(32) };
      await db.updateUser(newUser);

      const oldUser = await db.getUser(user.id);
      expect(oldUser).toEqual(user);

      const updatedUser = await db.getUser(newUser.id);
      expect(updatedUser).toBeUndefined();
    });

    it('add user tx to db and get it by user id and tx hash', async () => {
      const userTx = randomUserTx();
      await db.addUserTx(userTx);

      const newUserId = randomBytes(32);
      const sharedUserTx = { ...userTx, userId: newUserId };
      await db.addUserTx(sharedUserTx);

      const savedUserTx = await db.getUserTx(userTx.userId, userTx.txHash);
      expect(savedUserTx).toEqual(userTx);

      const newUserTx = await db.getUserTx(newUserId, userTx.txHash);
      expect(newUserTx).toEqual(sharedUserTx);
    });

    it('will override old data if try to add a user tx with the same user id and tx hash combination', async () => {
      const userTx = randomUserTx();
      await db.addUserTx(userTx);

      const newUserTx = randomUserTx();
      newUserTx.userId = userTx.userId;
      newUserTx.txHash = userTx.txHash;
      await db.addUserTx(newUserTx);

      const savedUserTx = await db.getUserTx(userTx.userId, userTx.txHash);
      expect(savedUserTx).toEqual(newUserTx);
    });

    it('settle a user tx with specified user id and tx hash', async () => {
      const userTx = randomUserTx();

      const userId0 = randomBytes(32);
      await db.addUserTx({ ...userTx, userId: userId0 });

      const userId1 = randomBytes(32);
      await db.addUserTx({ ...userTx, userId: userId1 });

      await db.settleUserTx(userId0, userTx.txHash);

      const userTx0 = await db.getUserTx(userId0, userTx.txHash);
      expect(userTx0!.settled).toBe(true);

      const userTx1 = await db.getUserTx(userId1, userTx.txHash);
      expect(userTx1!.settled).toBe(false);
    });

    it('get all txs for a user from newest to oldest', async () => {
      const userId = randomBytes(32);
      const userTxs: UserTx[] = [];
      const now = Date.now();
      for (let i = 0; i < 5; ++i) {
        const userTx = randomUserTx();
        userTx.userId = userId;
        userTx.created = new Date(now + i);
        await db.addUserTx(userTx);
        userTxs.push(userTx);
      }

      const savedUserTxs = await db.getUserTxs(userId);
      expect(savedUserTxs).toEqual(userTxs.reverse());
    });

    it('add signing key and get all keys for a user', async () => {
      const owner = randomBytes(32);
      const userKeys: SigningKey[] = [];
      for (let i = 0; i < 3; ++i) {
        const signingKey = randomSigningKey();
        signingKey.owner = owner;
        await db.addUserSigningKey(signingKey);
        userKeys.push(signingKey);
      }
      for (let i = 0; i < 5; ++i) {
        const signingKey = randomSigningKey();
        await db.addUserSigningKey(signingKey);
      }

      const savedUserKeys = await db.getUserSigningKeys(owner);
      expect(sort(savedUserKeys, 'key')).toEqual(sort(userKeys, 'key'));
    });

    it('remove a signing key of specified owner and key combination', async () => {
      const owner0 = randomBytes(32);
      const owner1 = randomBytes(32);
      const signingKey = randomSigningKey();
      const signingKey0 = { ...signingKey, owner: owner0 };
      const signingKey1 = { ...signingKey, owner: owner1 };
      await db.addUserSigningKey(signingKey0);
      await db.addUserSigningKey(signingKey1);

      await db.removeUserSigningKey(signingKey0);

      const savedSigningKeys0 = await db.getUserSigningKeys(owner0);
      expect(savedSigningKeys0).toEqual([]);

      const savedSigningKeys1 = await db.getUserSigningKeys(owner1);
      expect(savedSigningKeys1).toEqual([signingKey1]);
    });

    it('get the index of a signing key', async () => {
      const owner0 = randomBytes(32);
      const owner1 = randomBytes(32);
      const signingKey = randomSigningKey();
      signingKey.owner = owner0;
      await db.addUserSigningKey(signingKey);

      const fullKey = new GrumpkinAddress(Buffer.concat([signingKey.key, randomBytes(32)]));
      const index0 = await db.getUserSigningKeyIndex(owner0, fullKey);
      expect(index0).toEqual(signingKey.treeIndex);

      const index1 = await db.getUserSigningKeyIndex(owner1, fullKey);
      expect(index1).toBeUndefined();
    });

    it('save alias and address pair', async () => {
      const aliasHash = randomBytes(10);
      const address = GrumpkinAddress.randomAddress();
      await db.addAlias(aliasHash, address);

      const savedAddress = await db.getAliasAddress(aliasHash);
      expect(savedAddress).toEqual(address);

      const emptyAddress = await db.getAliasAddress(randomBytes(10));
      expect(emptyAddress).toBeUndefined();
    });

    it('add, get and delete key', async () => {
      const name = 'secretKey';
      const key = randomBytes(1000);
      await db.addKey(name, key);

      expect(await db.getKey(name)).toEqual(key);

      await db.deleteKey(name);

      expect(await db.getKey(name)).toBeUndefined();
    });

    it('can reset user related data', async () => {
      const aliasHash = randomBytes(10);
      const address = GrumpkinAddress.randomAddress();
      await db.addAlias(aliasHash, address);

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

      const userTx = randomUserTx();
      await db.addUserTx(userTx);

      await db.resetUsers();

      expect(await db.getAliasAddress(aliasHash)).toBeUndefined();
      expect(await db.getNote(note.index)).toBeUndefined();
      expect(await db.getUserSigningKeyIndex(signingKey.owner, fullKey)).toBeUndefined();
      expect(await db.getUserTx(userTx.userId, userTx.txHash)).toBeUndefined();

      expect(await db.getUser(user.id)).toEqual({
        ...user,
        syncedToRollup: -1,
      });

      expect(await db.getKey(keyName)).toEqual(key);
    });

    it('can clear all tables', async () => {
      const aliasHash = randomBytes(10);
      const address = GrumpkinAddress.randomAddress();
      await db.addAlias(aliasHash, address);

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

      const userTx = randomUserTx();
      await db.addUserTx(userTx);

      await db.clear();

      expect(await db.getAliasAddress(aliasHash)).toBeUndefined();
      expect(await db.getNote(note.index)).toBeUndefined();
      expect(await db.getUser(user.id)).toBeUndefined();
      expect(await db.getKey(keyName)).toBeUndefined();
      expect(await db.getUserSigningKeyIndex(signingKey.owner, fullKey)).toBeUndefined();
      expect(await db.getUserTx(userTx.userId, userTx.txHash)).toBeUndefined();
    });
  });
};
