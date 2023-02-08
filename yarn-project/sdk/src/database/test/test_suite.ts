import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { sleep } from '@aztec/barretenberg/sleep';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from '@aztec/barretenberg/crypto';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../../core_tx/index.js';
import { Note } from '../../note/index.js';
import { UserData } from '../../user/index.js';
import { Alias, Database, SpendingKey } from '../database.js';
import {
  randomAccountTx,
  randomAlias,
  randomDefiTx,
  randomNote,
  randomPaymentTx,
  randomSpendingKey,
  randomUser,
} from './fixtures.js';
import { jest } from '@jest/globals';

// some of the bulk saving operations take a few seconds to complete
jest.setTimeout(30 * 1000);

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

    describe('Note', () => {
      it('add note to db and get note by its commitment', async () => {
        const note = randomNote(undefined, { value: 2899999999999990600n });

        await db.addNote(note);

        const savedNote = await db.getNote(note.commitment);
        expect(savedNote).toEqual(note);
      });

      it('override existing note that has the same commitment', async () => {
        const note = randomNote({ allowChain: false });
        await db.addNote(note);

        expect(await db.getNote(note.commitment)).toEqual(note);

        const note2 = randomNote({ ...note, allowChain: true });
        await db.addNote(note2);

        expect(await db.getNote(note.commitment)).toEqual(note2);
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

        const savedNote = await db.getNote(note.commitment);
        expect(savedNote!.nullified).toBe(false);

        await db.nullifyNote(note.nullifier);

        const updatedNote = await db.getNote(note.commitment);
        expect(updatedNote!.nullified).toBe(true);
      });

      it('get all notes belonging to a user that are not nullified', async () => {
        const userId = GrumpkinAddress.random();
        const userNotes: Note[] = [];
        for (let i = 0; i < 10; ++i) {
          const note = randomNote(undefined, { ownerPubKey: userId });
          await db.addNote(note);
          if (i % 3) {
            await db.nullifyNote(note.nullifier);
          } else {
            userNotes.push(note);
          }
        }
        for (let i = 0; i < 5; ++i) {
          const note = randomNote(undefined, { ownerPubKey: GrumpkinAddress.random() });
          await db.addNote(note);
        }

        const savedNotes = await db.getNotes(userId);
        expect(savedNotes.length).toEqual(userNotes.length);
        expect(savedNotes).toEqual(expect.arrayContaining(userNotes));
      });

      it('get all pending notes belonging to a user', async () => {
        const userId = GrumpkinAddress.random();
        const userPendingNotes: Note[] = [];
        for (let i = 0; i < 10; ++i) {
          const index = i % 2 ? i : undefined;
          const note = randomNote({ index }, { ownerPubKey: userId });
          if (index === undefined) {
            userPendingNotes.push(note);
          }
          await db.addNote(note);
        }
        for (let i = 0; i < 5; ++i) {
          const note = randomNote(undefined, { ownerPubKey: GrumpkinAddress.random() });
          await db.addNote(note);
        }

        const savedNotes = await db.getPendingNotes(userId);
        expect(savedNotes.length).toEqual(userPendingNotes.length);
        expect(savedNotes).toEqual(expect.arrayContaining(userPendingNotes));
      });

      it('delete note by nullifier', async () => {
        const userId = GrumpkinAddress.random();
        const notes: Note[] = [];
        for (let i = 0; i < 5; ++i) {
          const note = randomNote(undefined, { ownerPubKey: userId });
          await db.addNote(note);
          notes.push(note);
        }

        {
          const savedNotes = await db.getNotes(userId);
          expect(savedNotes.length).toEqual(5);
          expect(savedNotes).toEqual(expect.arrayContaining(notes));
        }

        await db.removeNote(notes[1].nullifier);
        await db.removeNote(notes[3].nullifier);

        {
          const savedNotes = await db.getNotes(userId);
          expect(savedNotes.length).toEqual(3);
          expect(savedNotes).toEqual(expect.arrayContaining([notes[0], notes[2], notes[4]]));
        }
      });
    });

    describe('User', () => {
      it('add user to db and get user by id', async () => {
        const user = randomUser();
        await db.addUser(user);

        const savedUser = await db.getUser(user.accountPublicKey);
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
        expect(savedUsers.length).toBe(users.length);
        expect(savedUsers).toEqual(expect.arrayContaining(users));
      });

      it('update data for an existing user', async () => {
        const user = randomUser();
        await db.addUser(user);

        const newUser = { ...user, syncedToRollup: user.syncedToRollup + 1 };
        await db.updateUser(newUser);

        const updatedUser = await db.getUser(user.accountPublicKey);
        expect(updatedUser).toEqual(newUser);
      });

      it('ignore if try to update a non existent user', async () => {
        const user = randomUser();
        await db.addUser(user);

        const newUser = { ...user, accountPublicKey: GrumpkinAddress.random() };
        await db.updateUser(newUser);

        const oldUser = await db.getUser(user.accountPublicKey);
        expect(oldUser).toEqual(user);

        const updatedUser = await db.getUser(newUser.accountPublicKey);
        expect(updatedUser).toBeUndefined();
      });
    });

    describe('PaymentTx', () => {
      it('add payment tx to db and get it by user id and tx hash', async () => {
        const tx = randomPaymentTx();
        await db.upsertPaymentTx(tx);

        const newUserId = GrumpkinAddress.random();
        const sharedTx = { ...tx, userId: newUserId };
        await db.upsertPaymentTx(sharedTx);

        const savedTx = await db.getPaymentTx(tx.userId, tx.txId);
        expect(savedTx).toEqual(tx);

        const newTx = await db.getPaymentTx(newUserId, tx.txId);
        expect(newTx).toEqual(sharedTx);
      });

      it('will override old data if try to add a user tx with the same user id and tx hash combination', async () => {
        const tx = randomPaymentTx();
        await db.upsertPaymentTx(tx);

        const newTx = randomPaymentTx({ userId: tx.userId, txId: tx.txId });
        await db.upsertPaymentTx(newTx);

        const savedTx = await db.getPaymentTx(tx.userId, tx.txId);
        expect(savedTx).toEqual(newTx);
      });

      it('settle payment tx for specific user', async () => {
        const tx = randomPaymentTx();

        const userId0 = GrumpkinAddress.random();
        await db.upsertPaymentTx({ ...tx, userId: userId0 });

        const userId1 = GrumpkinAddress.random();
        const settled = new Date();
        await db.upsertPaymentTx({ ...tx, userId: userId1, settled });

        const tx0 = await db.getPaymentTx(userId0, tx.txId);
        expect(tx0!.settled).toEqual(undefined);

        const tx1 = await db.getPaymentTx(userId1, tx.txId);
        expect(tx1!.settled).toEqual(settled);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const userId0 = GrumpkinAddress.random();
        const userId1 = GrumpkinAddress.random();
        const settledTxs0: CorePaymentTx[] = [];
        const settledTxs1: CorePaymentTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomPaymentTx({ userId: userId0, settled: new Date(now + i) });
          await db.upsertPaymentTx(tx0);
          settledTxs0.push(tx0);

          const tx1 = randomPaymentTx({ userId: userId1, settled: new Date(now - i) });
          await db.upsertPaymentTx(tx1);
          settledTxs1.push(tx1);
        }

        expect(await db.getPaymentTxs(userId0)).toEqual([...settledTxs0].reverse());
        expect(await db.getPaymentTxs(userId1)).toEqual(settledTxs1);

        const unsettledTxs0: CorePaymentTx[] = [];
        const unsettledTxs1: CorePaymentTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomPaymentTx({ userId: userId0, created: new Date(now - i) });
          await db.upsertPaymentTx(tx0);
          unsettledTxs0.push(tx0);

          const tx1 = randomPaymentTx({ userId: userId1, created: new Date(now + i) });
          await db.upsertPaymentTx(tx1);
          unsettledTxs1.push(tx1);
        }

        expect(await db.getPaymentTxs(userId0)).toEqual(unsettledTxs0.concat([...settledTxs0].reverse()));
        expect(await db.getPaymentTxs(userId1)).toEqual([...unsettledTxs1].reverse().concat(settledTxs1));
      });
    });

    describe('AccountTx', () => {
      it('add account tx to db and get it by tx hash', async () => {
        const tx0 = randomAccountTx();
        await db.upsertAccountTx(tx0);

        const tx1 = randomAccountTx();
        await db.upsertAccountTx(tx1);

        expect(await db.getAccountTx(tx0.txId)).toEqual(tx0);
        expect(await db.getAccountTx(tx1.txId)).toEqual(tx1);
      });

      it('will override old data if try to add an account tx with existing tx hash', async () => {
        const tx = randomAccountTx();
        await db.upsertAccountTx(tx);

        const newTx = randomAccountTx({ txId: tx.txId, userId: tx.userId });
        await db.upsertAccountTx(newTx);

        const savedTx = await db.getAccountTx(tx.txId);
        expect(savedTx).toEqual(newTx);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const userId = GrumpkinAddress.random();
        const txs: CoreAccountTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx = randomAccountTx({ userId, created: new Date(now + i), settled: new Date(now + i) });
          await db.upsertAccountTx(tx);
          txs.push(tx);

          const tx2 = randomAccountTx();
          await db.upsertAccountTx(tx2);
        }

        expect(await db.getAccountTxs(userId)).toEqual([...txs].reverse());

        const unsettledTxs0: CoreAccountTx[] = [];
        const unsettledTxs1: CoreAccountTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx = randomAccountTx({ userId, created: new Date(now - i) });
          await db.upsertAccountTx(tx);
          unsettledTxs0.push(tx);
        }
        for (let i = 0; i < 5; ++i) {
          const tx = randomAccountTx({ userId, created: new Date(now + unsettledTxs0.length + i) });
          await db.upsertAccountTx(tx);
          unsettledTxs1.push(tx);
        }

        expect(await db.getAccountTxs(userId)).toEqual([
          ...unsettledTxs1.reverse(),
          ...unsettledTxs0,
          ...txs.reverse(),
        ]);
      });
    });

    describe('DefiTx', () => {
      it('add defi tx to db and get it by tx id', async () => {
        const tx1 = randomDefiTx();
        await db.upsertDefiTx(tx1);
        const tx2 = randomDefiTx();
        await db.upsertDefiTx(tx2);

        expect(await db.getDefiTx(tx1.txId)).toEqual(tx1);
        expect(await db.getDefiTx(tx2.txId)).toEqual(tx2);
      });

      it('will override old data if try to add a defi tx with the same tx hash and user id', async () => {
        const tx = randomDefiTx();
        await db.upsertDefiTx(tx);

        const newTx = randomDefiTx({ txId: tx.txId, userId: tx.userId });
        await db.upsertDefiTx(newTx);

        const savedTx = await db.getDefiTx(tx.txId);
        expect(savedTx).toEqual(newTx);
      });

      it('update defi tx with interaction nonce and isAsync', async () => {
        const tx = randomDefiTx();
        await db.upsertDefiTx(tx);

        const savedTx = (await db.getDefiTx(tx.txId))!;
        expect(savedTx).toEqual(tx);

        tx.interactionNonce = 32;
        tx.isAsync = true;
        tx.settled = new Date(tx.created.getTime() + 1000);
        await db.upsertDefiTx(tx);

        const settledTx = (await db.getDefiTx(tx.txId))!;
        expect(settledTx).toEqual(tx);
      });

      it('update defi tx with interaction result', async () => {
        const tx = randomDefiTx();
        await db.upsertDefiTx(tx);

        const savedTx = (await db.getDefiTx(tx.txId))!;
        expect(savedTx.outputValueA).toBe(undefined);
        expect(savedTx.outputValueB).toBe(undefined);
        expect(savedTx.settled).toBeFalsy();

        tx.outputValueA = 123n;
        tx.outputValueB = 456n;
        tx.success = true;
        tx.finalised = new Date(tx.created.getTime() + 123);
        await db.upsertDefiTx(tx);

        const settledTx = (await db.getDefiTx(tx.txId))!;
        expect(settledTx).toEqual(tx);
      });

      it('claim defi tx', async () => {
        const tx = randomDefiTx();
        await db.upsertDefiTx(tx);

        const savedTx = (await db.getDefiTx(tx.txId))!;
        expect(savedTx.claimSettled).toBeFalsy();
        expect(savedTx.claimTxId).toBeFalsy();

        tx.claimSettled = new Date();
        tx.claimTxId = TxId.random();
        await db.upsertDefiTx(tx);

        const settledTx = (await db.getDefiTx(tx.txId))!;
        expect(settledTx.claimSettled).toEqual(tx.claimSettled);
        expect(settledTx.claimTxId).toEqual(tx.claimTxId);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const userId0 = GrumpkinAddress.random();
        const userId1 = GrumpkinAddress.random();
        const settledTxs0: CoreDefiTx[] = [];
        const settledTxs1: CoreDefiTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomDefiTx({ userId: userId0, settled: new Date(now + i), interactionNonce: i });
          await db.upsertDefiTx(tx0);
          settledTxs0.push(tx0);

          const tx1 = randomDefiTx({ userId: userId1, settled: new Date(now - i), interactionNonce: i });
          await db.upsertDefiTx(tx1);
          settledTxs1.push(tx1);
        }

        expect(await db.getDefiTxs(userId0)).toEqual([...settledTxs0].reverse());
        expect(await db.getDefiTxs(userId1)).toEqual(settledTxs1);

        const unsettledTxs0: CoreDefiTx[] = [];
        const unsettledTxs1: CoreDefiTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomDefiTx({ userId: userId0, created: new Date(now - i), interactionNonce: i });
          await db.upsertDefiTx(tx0);
          unsettledTxs0.push(tx0);

          const tx1 = randomDefiTx({ userId: userId1, created: new Date(now + i), interactionNonce: i });
          await db.upsertDefiTx(tx1);
          unsettledTxs1.push(tx1);
        }

        expect(await db.getDefiTxs(userId0)).toEqual(unsettledTxs0.concat([...settledTxs0].reverse()));
        expect(await db.getDefiTxs(userId1)).toEqual([...unsettledTxs1].reverse().concat(settledTxs1));
      });

      it('get all defi txs by nonce', async () => {
        const userId0 = GrumpkinAddress.random();
        const userId1 = GrumpkinAddress.random();
        const settledTxs0: CoreDefiTx[] = [];
        const settledTxs1: CoreDefiTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 10; ++i) {
          {
            const tx = randomDefiTx({ userId: userId0, created: new Date(now + i) });
            await db.upsertDefiTx(tx);
            const settledTx = { ...tx, interactionNonce: i % 2, isAsync: !(i % 3), settled: new Date(now + 10 + i) };
            settledTxs0.push(settledTx);
            await db.upsertDefiTx(settledTx);
          }
          {
            const tx = randomDefiTx({ userId: userId1, created: new Date(now - i) });
            await db.upsertDefiTx(tx);
            const settledTx = { ...tx, interactionNonce: i % 2, isAsync: !(i % 3), settled: new Date(now + 10 - i) };
            settledTxs1.push(settledTx);
            await db.upsertDefiTx(settledTx);
          }
        }

        expect(await db.getDefiTxs(userId0)).toEqual([...settledTxs0].reverse());
        expect(await db.getDefiTxs(userId1)).toEqual(settledTxs1);
      });
    });

    describe('UserTx', () => {
      it('return txs from newest to oldest', async () => {
        const userId = GrumpkinAddress.random();
        const txs: CoreUserTx[] = [];
        const paymentTxs: CorePaymentTx[] = [];
        const accountTxs: CoreAccountTx[] = [];
        const defiTxs: CoreDefiTx[] = [];
        const now = Date.now();
        const createPaymentTx = async (settled = false) => {
          const tx = randomPaymentTx({
            userId,
            created: new Date(now + txs.length),
            settled: settled ? new Date(now + txs.length) : undefined,
          });
          await db.upsertPaymentTx(tx);
          txs.push(tx);
          paymentTxs.push(tx);
        };
        const createAccountTx = async (settled = false) => {
          const tx = randomAccountTx({
            userId,
            created: new Date(now + txs.length),
            settled: settled ? new Date(now + txs.length) : undefined,
          });
          await db.upsertAccountTx(tx);
          txs.push(tx);
          accountTxs.push(tx);
        };
        const createDefiTx = async (settled = false) => {
          const tx = randomDefiTx({
            userId,
            created: new Date(now + txs.length),
            settled: settled ? new Date(now + txs.length) : undefined,
          });
          await db.upsertDefiTx(tx);
          txs.push(tx);
          defiTxs.push(tx);
        };

        await createPaymentTx(true);
        await createDefiTx(true);
        await createDefiTx(true);
        await createPaymentTx(true);
        await createAccountTx(true);
        await createDefiTx();
        await createPaymentTx();
        await createAccountTx();
        await createAccountTx();

        expect(await db.getUserTxs(userId)).toEqual([...txs].reverse());
        expect(await db.getPaymentTxs(userId)).toEqual([...paymentTxs].reverse());
        expect(await db.getAccountTxs(userId)).toEqual([...accountTxs].reverse());
        expect(await db.getDefiTxs(userId)).toEqual([...defiTxs].reverse());
      });

      it('only return a tx with the correct type', async () => {
        const jsTx = randomPaymentTx();
        await db.upsertPaymentTx(jsTx);
        const accountTx = randomAccountTx();
        await db.upsertAccountTx(accountTx);
        const defiTx = randomDefiTx();
        await db.upsertDefiTx(defiTx);

        expect(await db.getPaymentTx(jsTx.userId, jsTx.txId)).toEqual(jsTx);
        expect(await db.getPaymentTx(accountTx.userId, accountTx.txId)).toBe(undefined);
        expect(await db.getPaymentTx(defiTx.userId, defiTx.txId)).toBe(undefined);

        expect(await db.getAccountTx(jsTx.txId)).toBe(undefined);
        expect(await db.getAccountTx(accountTx.txId)).toEqual(accountTx);
        expect(await db.getAccountTx(defiTx.txId)).toBe(undefined);

        expect(await db.getDefiTx(jsTx.txId)).toBe(undefined);
        expect(await db.getDefiTx(accountTx.txId)).toBe(undefined);
        expect(await db.getDefiTx(defiTx.txId)).toEqual(defiTx);
      });

      it('check if a tx is settled', async () => {
        const jsTx = randomPaymentTx();
        await db.upsertPaymentTx(jsTx);
        const accountTx = randomAccountTx();
        await db.upsertAccountTx(accountTx);
        const defiTx = randomDefiTx();
        await db.upsertDefiTx(defiTx);

        expect(await db.isUserTxSettled(jsTx.txId)).toBe(false);
        expect(await db.isUserTxSettled(accountTx.txId)).toBe(false);
        expect(await db.isUserTxSettled(defiTx.txId)).toBe(false);

        const settled = new Date();
        await db.upsertPaymentTx({ ...jsTx, settled });
        await db.upsertAccountTx({ ...accountTx, settled });
        await db.upsertDefiTx({ ...defiTx, interactionNonce: 1, isAsync: false, settled: new Date() });

        expect(await db.isUserTxSettled(jsTx.txId)).toBe(true);
        expect(await db.isUserTxSettled(accountTx.txId)).toBe(true);
        expect(await db.isUserTxSettled(defiTx.txId)).toBe(true);
      });

      it('return true only when all payment txs with the same txId are settled', async () => {
        const txs: CorePaymentTx[] = [];
        const txId = TxId.random();
        for (let i = 0; i < 5; ++i) {
          const tx = randomPaymentTx({ txId, settled: i ? new Date() : undefined });
          await db.upsertPaymentTx(tx);
          txs.push(tx);
        }

        expect(await db.isUserTxSettled(txId)).toBe(false);

        await db.upsertPaymentTx({ ...txs[0], settled: new Date() });

        expect(await db.isUserTxSettled(txId)).toBe(true);
      });

      it('get pending user txs', async () => {
        const expectedPendingTxs: CoreUserTx[] = [];
        const userId = GrumpkinAddress.random();
        for (let i = 0; i < 10; ++i) {
          const jsTx = randomPaymentTx({ userId: i % 3 ? userId : GrumpkinAddress.random() });
          await db.upsertPaymentTx(jsTx);
          if (i % 2) {
            await db.upsertPaymentTx({ ...jsTx, settled: new Date() });
          } else if (i % 3) {
            expectedPendingTxs.push(jsTx);
          }

          const accountTx = randomAccountTx({ userId: i % 3 ? userId : GrumpkinAddress.random() });
          await db.upsertAccountTx(accountTx);
          if (!(i % 2)) {
            await db.upsertAccountTx({ ...accountTx, settled: new Date() });
          } else if (i % 3) {
            expectedPendingTxs.push(accountTx);
          }

          const defiTx = randomDefiTx({ userId: i % 3 ? userId : GrumpkinAddress.random() });
          await db.upsertDefiTx(defiTx);
          if (!(i % 2)) {
            await db.upsertDefiTx({ ...defiTx, interactionNonce: 12, isAsync: false, settled: new Date() });
          } else if (i % 3) {
            expectedPendingTxs.push(defiTx);
          }
        }

        const pendingTxs = await db.getPendingUserTxs(userId);
        expect(pendingTxs.length).toBe(expectedPendingTxs.length);
        expect(pendingTxs).toEqual(expect.arrayContaining(expectedPendingTxs));
      });

      it('remove tx by txId and userId', async () => {
        const userA = GrumpkinAddress.random();
        const userB = GrumpkinAddress.random();

        const jsTx0 = randomPaymentTx({ userId: userA });
        await db.upsertPaymentTx(jsTx0);
        await db.upsertPaymentTx({ ...jsTx0, userId: userB });
        const jsTx1 = randomPaymentTx({ userId: userA });
        await db.upsertPaymentTx(jsTx1);
        await db.upsertPaymentTx({ ...jsTx1, userId: userB });

        const accountTx0 = randomAccountTx({ userId: userA });
        const accountTx1 = randomAccountTx({ userId: userB });
        await db.upsertAccountTx(accountTx0);
        await db.upsertAccountTx(accountTx1);

        const defiTx0 = randomDefiTx({ userId: userA });
        const defiTx1 = randomDefiTx({ userId: userB });
        await db.upsertDefiTx(defiTx0);
        await db.upsertDefiTx(defiTx1);

        await db.removeUserTx(userA, jsTx0.txId);
        await db.removeUserTx(userB, jsTx1.txId);
        await db.removeUserTx(userA, accountTx0.txId);
        await db.removeUserTx(userA, defiTx0.txId);

        expect(await db.getPaymentTxs(userA)).toEqual([expect.objectContaining({ ...jsTx1, userId: userA })]);
        expect(await db.getPaymentTxs(userB)).toEqual([expect.objectContaining({ ...jsTx0, userId: userB })]);
        expect(await db.getAccountTxs(userA)).toEqual([]);
        expect(await db.getAccountTxs(userB)).toEqual([accountTx1]);
        expect(await db.getDefiTxs(userA)).toEqual([]);
        expect(await db.getDefiTxs(userB)).toEqual([defiTx1]);
      });
    });

    describe('SpendingKey', () => {
      it('add spending key and get all keys for a user', async () => {
        const userId = GrumpkinAddress.random();
        const keys: SpendingKey[] = [];
        for (let i = 0; i < 3; ++i) {
          const spendingKey = randomSpendingKey({ userId });
          await db.addSpendingKey(spendingKey);
          keys.push(spendingKey);
        }
        for (let i = 0; i < 5; ++i) {
          const spendingKey = randomSpendingKey();
          await db.addSpendingKey(spendingKey);
        }

        const savedSpendingKeys = await db.getSpendingKeys(userId);
        expect(savedSpendingKeys.length).toEqual(keys.length);
        expect(savedSpendingKeys).toEqual(expect.arrayContaining(keys));
      });

      it('override the existing data when adding spending keys with the same userId and key', async () => {
        const userId = GrumpkinAddress.random();
        const key1 = randomSpendingKey({ userId });

        await db.addSpendingKey(key1);
        expect(await db.getSpendingKeys(userId)).toEqual([key1]);

        const key2 = { ...key1, treeIndex: key1.treeIndex + 1 };
        await db.addSpendingKey(key2);
        expect(await db.getSpendingKeys(userId)).toEqual([key2]);

        const key3 = { ...key1, userId: GrumpkinAddress.random() };
        await db.addSpendingKey(key3);
        expect(await db.getSpendingKeys(userId)).toEqual([key2]);

        const key4 = { ...key1, key: randomBytes(32) };
        await db.addSpendingKey(key4);

        const savedKeys = await db.getSpendingKeys(userId);
        expect(savedKeys.length).toBe(2);
        expect(savedKeys).toEqual(expect.arrayContaining([key2, key4]));
      });

      it('writing duplicate spending keys does not error', async () => {
        const userId = GrumpkinAddress.random();
        const key1 = randomSpendingKey({ userId });
        const key2 = { ...randomSpendingKey({ userId }), treeIndex: key1.treeIndex + 1 };

        await db.addSpendingKeys([key1, key2]);
        await expect(db.addSpendingKeys([key1, key2])).resolves.not.toThrow();

        const savedKeys = await db.getSpendingKeys(userId);
        expect(savedKeys.length).toBe(2);
        expect(savedKeys).toEqual(expect.arrayContaining([key1, key2]));
      });

      it('remove all spending keys of given user id', async () => {
        const generateAccountSpendingKeys = async (userId: GrumpkinAddress, numKeys = 3) => {
          const keys: SpendingKey[] = [];
          for (let i = 0; i < numKeys; ++i) {
            const spendingKey = randomSpendingKey({ userId });
            await db.addSpendingKey(spendingKey);
            keys.push(spendingKey);
          }
          return keys;
        };

        const userId0 = GrumpkinAddress.random();
        const userId1 = GrumpkinAddress.random();
        const keys0 = await generateAccountSpendingKeys(userId0);
        const keys1 = await generateAccountSpendingKeys(userId1);

        const savedSpendingKeys0 = await db.getSpendingKeys(userId0);
        expect(savedSpendingKeys0.length).toBe(keys0.length);
        expect(savedSpendingKeys0).toEqual(expect.arrayContaining(keys0));

        await db.removeSpendingKeys(userId0);

        expect(await db.getSpendingKeys(userId0)).toEqual([]);

        const savedSpendingKeys1 = await db.getSpendingKeys(userId1);
        expect(savedSpendingKeys1.length).toBe(keys1.length);
        expect(savedSpendingKeys1).toEqual(expect.arrayContaining(keys1));
      });

      it('retrieve a spending key', async () => {
        const userId = GrumpkinAddress.random();
        const spendingKey = randomSpendingKey();
        spendingKey.userId = userId;
        await db.addSpendingKey(spendingKey);

        const fullKey = new GrumpkinAddress(Buffer.concat([spendingKey.key, randomBytes(32)]));
        const key1 = await db.getSpendingKey(userId, fullKey);
        expect(key1).toEqual(spendingKey);

        const key2 = await db.getSpendingKey(GrumpkinAddress.random(), fullKey);
        expect(key2).toBeUndefined();
      });

      it('bulk saves spendingKeys', async () => {
        const keys = Array<SpendingKey>();
        const numKeys = 500;
        for (let i = 0; i < numKeys; i++) {
          keys.push(randomSpendingKey());
        }
        await db.addSpendingKeys(keys);

        let [dbKey] = await db.getSpendingKeys(keys[0].userId);
        expect(dbKey).toEqual(keys[0]);

        [dbKey] = await db.getSpendingKeys(keys[1].userId);
        expect(dbKey).toEqual(keys[1]);

        [dbKey] = await db.getSpendingKeys(keys[100].userId);
        expect(dbKey).toEqual(keys[100]);

        [dbKey] = await db.getSpendingKeys(keys[101].userId);
        expect(dbKey).toEqual(keys[101]);

        [dbKey] = await db.getSpendingKeys(keys[numKeys - 1].userId);
        expect(dbKey).toEqual(keys[numKeys - 1]);

        await expect(db.addSpendingKeys(keys)).resolves.not.toThrow();

        [dbKey] = await db.getSpendingKeys(keys[numKeys - 1].userId);
        expect(dbKey).toEqual(keys[numKeys - 1]);
      });
    });

    describe('Alias', () => {
      it('save and lookup alias', async () => {
        const alias0 = randomAlias();
        await db.addAlias(alias0);

        expect(await db.getAlias(alias0.accountPublicKey)).toEqual(alias0);
        expect(await db.getAliasByAliasHash(alias0.aliasHash)).toEqual(alias0);
      });

      it('return undefined for unknown alias', async () => {
        expect(await db.getAliasByAliasHash(AliasHash.random())).toBeUndefined();
      });

      it('save alias and its account public key', async () => {
        const alias0 = randomAlias();
        await db.addAlias(alias0);

        const alias0Migrated = { ...alias0, accountPublicKey: GrumpkinAddress.random() };
        await db.addAlias(alias0Migrated);

        expect(await db.getAlias(alias0.accountPublicKey)).toBeUndefined();
        expect(await db.getAlias(alias0Migrated.accountPublicKey)).toEqual(alias0Migrated);
        expect(await db.getAliasByAliasHash(alias0.aliasHash)).toEqual(alias0Migrated);
      });

      it('bulk saves aliases', async () => {
        const aliases: Alias[] = [];
        const numAliases = 1000;
        for (let i = 0; i < numAliases; i++) {
          aliases.push(randomAlias({ index: i }));
        }
        aliases.push({ ...aliases[50], index: 1000 });

        await db.addAliases(aliases);

        expect(await db.getAlias(aliases[0].accountPublicKey)).toEqual(aliases[0]);
        expect(await db.getAlias(aliases[1].accountPublicKey)).toEqual(aliases[1]);
        expect(await db.getAlias(aliases[50].accountPublicKey)).toEqual({ ...aliases[50], index: 1000 });
        expect(await db.getAlias(aliases[100].accountPublicKey)).toEqual(aliases[100]);
        expect(await db.getAlias(aliases[101].accountPublicKey)).toEqual(aliases[101]);
        expect(await db.getAlias(aliases[999].accountPublicKey)).toEqual(aliases[999]);
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

      it('adding duplicate key overrides value', async () => {
        const name = 'secretKey';
        const key = randomBytes(1000);
        const key2 = randomBytes(500);
        await db.addKey(name, key);

        await expect(db.addKey(name, key2)).resolves.not.toThrow();

        expect(await db.getKey(name)).toEqual(key2);

        await db.deleteKey(name);

        expect(await db.getKey(name)).toBeUndefined();
      });
    });

    describe('Mutex', () => {
      const name = 'mutex-test';
      const timeout = 10000000;

      it('acquire and release locks', async () => {
        expect(await db.acquireLock('mutex-1', timeout)).toBe(true);
        expect(await db.acquireLock('mutex-2', timeout)).toBe(true);
        expect(await db.acquireLock('mutex-1', timeout)).toBe(false);
        expect(await db.acquireLock('mutex-2', timeout)).toBe(false);

        await db.releaseLock('mutex-2');

        expect(await db.acquireLock('mutex-1', timeout)).toBe(false);
        expect(await db.acquireLock('mutex-2', timeout)).toBe(true);
        expect(await db.acquireLock('mutex-1', timeout)).toBe(false);
        expect(await db.acquireLock('mutex-2', timeout)).toBe(false);
      });

      it('only one instance can acquire the lock', async () => {
        const result = await Promise.all([
          db.acquireLock(name, timeout),
          db.acquireLock(name, timeout),
          db.acquireLock(name, timeout),
          db.acquireLock(name, timeout),
        ]);
        expect(result.length).toBe(4);
        expect(result).toEqual(expect.arrayContaining([true, false, false, false]));
      });

      it('can acquire again if expired', async () => {
        expect(await db.acquireLock(name, 100)).toBe(true);

        await sleep(200);

        expect(await db.acquireLock(name, 100)).toBe(true);
      });

      it('can extend expiry time', async () => {
        expect(await db.acquireLock('mutex-1', 100)).toBe(true);
        expect(await db.acquireLock('mutex-2', 100)).toBe(true);

        await sleep(200);
        await db.extendLock('mutex-2', 10000000);

        expect(await db.acquireLock('mutex-1', 100)).toBe(true);
        expect(await db.acquireLock('mutex-2', 100)).toBe(false);
      });

      it('can not extend if lock does not exist', async () => {
        await db.extendLock('mutex-1', 10000000);
        expect(await db.acquireLock('mutex-1', 100)).toBe(true);
      });
    });

    describe('Reset and Cleanup', () => {
      const generateUserProfile = async (user: UserData) => {
        await db.addUser(user);

        const note = randomNote(undefined, { ownerPubKey: user.accountPublicKey });
        await db.addNote(note);

        const spendingKey = randomSpendingKey({ userId: user.accountPublicKey });
        await db.addSpendingKey(spendingKey);

        const paymentTx = randomPaymentTx({ userId: user.accountPublicKey });
        await db.upsertPaymentTx(paymentTx);

        const accountTx = randomAccountTx({ userId: user.accountPublicKey });
        await db.upsertAccountTx(accountTx);

        return { user, note, spendingKey, paymentTx, accountTx };
      };

      it('remove all data of a user', async () => {
        const user0 = randomUser();
        const user1 = randomUser();
        const profile0 = await generateUserProfile(user0);
        const profile1 = await generateUserProfile(user1);

        await db.removeUser(user0.accountPublicKey);

        expect(await db.getUser(user0.accountPublicKey)).toBeUndefined();
        expect(await db.getNotes(user0.accountPublicKey)).toEqual([]);
        expect(await db.getNote(profile0.note.commitment)).toBeUndefined();
        expect(await db.getSpendingKeys(user0.accountPublicKey)).toEqual([]);
        expect(await db.getPaymentTxs(user0.accountPublicKey)).toEqual([]);
        expect(await db.getAccountTxs(user0.accountPublicKey)).toEqual([]);

        expect(await db.getUser(user1.accountPublicKey)).toEqual(profile1.user);
        expect(await db.getNotes(user1.accountPublicKey)).toEqual([profile1.note]);
        expect(await db.getNote(profile1.note.commitment)).toEqual(profile1.note);
        expect(await db.getSpendingKeys(user1.accountPublicKey)).toEqual([profile1.spendingKey]);
        expect(await db.getPaymentTxs(user1.accountPublicKey)).toEqual([profile1.paymentTx]);
        expect(await db.getAccountTxs(user1.accountPublicKey)).toEqual([profile1.accountTx]);
      });

      it('can reset user related data', async () => {
        const alias = randomAlias();
        await db.addAlias(alias);

        const note = randomNote();
        await db.addNote(note);

        const user = randomUser({ syncedToRollup: 123 });
        await db.addUser(user);

        const keyName = 'secretKey';
        const key = randomBytes(1000);
        await db.addKey(keyName, key);

        const spendingKey = randomSpendingKey();
        const fullKey = new GrumpkinAddress(Buffer.concat([spendingKey.key, randomBytes(32)]));
        await db.addSpendingKey(spendingKey);

        const tx = randomPaymentTx();
        await db.upsertPaymentTx(tx);

        await db.resetUsers();

        expect(await db.getAlias(alias.accountPublicKey)).toEqual(alias);
        expect(await db.getNote(note.commitment)).toBeUndefined();
        expect(await db.getSpendingKey(spendingKey.userId, fullKey)).toBeUndefined();
        expect(await db.getPaymentTx(tx.userId, tx.txId)).toBeUndefined();
        expect(await db.getUser(user.accountPublicKey)).toEqual({
          ...user,
          syncedToRollup: -1,
        });
        expect(await db.getKey(keyName)).toEqual(key);
      });

      it('can clear all tables', async () => {
        const alias = randomAlias();
        await db.addAlias(alias);

        const note = randomNote();
        await db.addNote(note);

        const user = randomUser();
        await db.addUser(user);

        const keyName = 'secretKey';
        const key = randomBytes(1000);
        await db.addKey(keyName, key);

        const spendingKey = randomSpendingKey();
        const fullKey = new GrumpkinAddress(Buffer.concat([spendingKey.key, randomBytes(32)]));
        await db.addSpendingKey(spendingKey);

        const tx = randomPaymentTx();
        await db.upsertPaymentTx(tx);

        await db.clear();

        expect(await db.getAlias(alias.accountPublicKey)).toBeUndefined();
        expect(await db.getNote(note.commitment)).toBeUndefined();
        expect(await db.getUser(user.accountPublicKey)).toBeUndefined();
        expect(await db.getKey(keyName)).toBeUndefined();
        expect(await db.getSpendingKey(spendingKey.userId, fullKey)).toBeUndefined();
        expect(await db.getPaymentTx(tx.userId, tx.txId)).toBeUndefined();
      });
    });
  });
};
