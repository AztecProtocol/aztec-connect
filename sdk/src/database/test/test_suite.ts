import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from 'crypto';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../../core_tx';
import { Note } from '../../note';
import { UserData } from '../../user';
import { Alias, Database, SpendingKey } from '../database';
import {
  randomAccountTx,
  randomAlias,
  randomClaimTx,
  randomDefiTx,
  randomNote,
  randomPaymentTx,
  randomSpendingKey,
  randomUser,
} from './fixtures';

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
        expect(savedUsers.length).toBe(users.length);
        expect(savedUsers).toEqual(expect.arrayContaining(users));
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

        const newUser = { ...user, id: GrumpkinAddress.random() };
        await db.updateUser(newUser);

        const oldUser = await db.getUser(user.id);
        expect(oldUser).toEqual(user);

        const updatedUser = await db.getUser(newUser.id);
        expect(updatedUser).toBeUndefined();
      });
    });

    describe('PaymentTx', () => {
      it('add payment tx to db and get it by user id and tx hash', async () => {
        const tx = randomPaymentTx();
        await db.addPaymentTx(tx);

        const newUserId = GrumpkinAddress.random();
        const sharedTx = { ...tx, userId: newUserId };
        await db.addPaymentTx(sharedTx);

        const savedTx = await db.getPaymentTx(tx.userId, tx.txId);
        expect(savedTx).toEqual(tx);

        const newTx = await db.getPaymentTx(newUserId, tx.txId);
        expect(newTx).toEqual(sharedTx);
      });

      it('will override old data if try to add a user tx with the same user id and tx hash combination', async () => {
        const tx = randomPaymentTx();
        await db.addPaymentTx(tx);

        const newTx = randomPaymentTx({ userId: tx.userId, txId: tx.txId });
        await db.addPaymentTx(newTx);

        const savedTx = await db.getPaymentTx(tx.userId, tx.txId);
        expect(savedTx).toEqual(newTx);
      });

      it('settle payment tx for specific user', async () => {
        const tx = randomPaymentTx();

        const userId0 = GrumpkinAddress.random();
        await db.addPaymentTx({ ...tx, userId: userId0 });

        const userId1 = GrumpkinAddress.random();
        await db.addPaymentTx({ ...tx, userId: userId1 });

        const settled = new Date();
        await db.settlePaymentTx(userId0, tx.txId, settled);

        const tx0 = await db.getPaymentTx(userId0, tx.txId);
        expect(tx0!.settled).toEqual(settled);

        const tx1 = await db.getPaymentTx(userId1, tx.txId);
        expect(tx1!.settled).toEqual(undefined);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const userId0 = GrumpkinAddress.random();
        const userId1 = GrumpkinAddress.random();
        const settledTxs0: CorePaymentTx[] = [];
        const settledTxs1: CorePaymentTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomPaymentTx({ userId: userId0, settled: new Date(now + i) });
          await db.addPaymentTx(tx0);
          settledTxs0.push(tx0);

          const tx1 = randomPaymentTx({ userId: userId1, settled: new Date(now - i) });
          await db.addPaymentTx(tx1);
          settledTxs1.push(tx1);
        }

        expect(await db.getPaymentTxs(userId0)).toEqual([...settledTxs0].reverse());
        expect(await db.getPaymentTxs(userId1)).toEqual(settledTxs1);

        const unsettledTxs0: CorePaymentTx[] = [];
        const unsettledTxs1: CorePaymentTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomPaymentTx({ userId: userId0, created: new Date(now - i) });
          await db.addPaymentTx(tx0);
          unsettledTxs0.push(tx0);

          const tx1 = randomPaymentTx({ userId: userId1, created: new Date(now + i) });
          await db.addPaymentTx(tx1);
          unsettledTxs1.push(tx1);
        }

        expect(await db.getPaymentTxs(userId0)).toEqual(unsettledTxs0.concat([...settledTxs0].reverse()));
        expect(await db.getPaymentTxs(userId1)).toEqual([...unsettledTxs1].reverse().concat(settledTxs1));
      });
    });

    describe('AccountTx', () => {
      it('add account tx to db and get it by tx hash', async () => {
        const tx0 = randomAccountTx();
        await db.addAccountTx(tx0);

        const tx1 = randomAccountTx();
        await db.addAccountTx(tx1);

        expect(await db.getAccountTx(tx0.txId)).toEqual(tx0);
        expect(await db.getAccountTx(tx1.txId)).toEqual(tx1);
      });

      it('will override old data if try to add an account tx with existing tx hash', async () => {
        const tx = randomAccountTx();
        await db.addAccountTx(tx);

        const newTx = randomAccountTx({ txId: tx.txId, userId: tx.userId });
        await db.addAccountTx(newTx);

        const savedTx = await db.getAccountTx(tx.txId);
        expect(savedTx).toEqual(newTx);
      });

      it('settle an account tx with a specific tx hash', async () => {
        const tx0 = randomAccountTx();
        const tx1 = randomAccountTx();
        await db.addAccountTx(tx0);
        await db.addAccountTx(tx1);

        const settled = new Date();
        await db.settleAccountTx(tx1.txId, settled);

        const savedTx0 = await db.getAccountTx(tx0.txId);
        expect(savedTx0!.settled).toBeFalsy();

        const savedTx1 = await db.getAccountTx(tx1.txId);
        expect(savedTx1!.settled).toEqual(settled);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const userId = GrumpkinAddress.random();
        const txs: CoreAccountTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx = randomAccountTx({ userId, created: new Date(now + i), settled: new Date(now + i) });
          await db.addAccountTx(tx);
          txs.push(tx);

          const tx2 = randomAccountTx();
          await db.addAccountTx(tx2);
        }

        expect(await db.getAccountTxs(userId)).toEqual([...txs].reverse());

        const unsettledTxs0: CoreAccountTx[] = [];
        const unsettledTxs1: CoreAccountTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx = randomAccountTx({ userId, created: new Date(now - i) });
          await db.addAccountTx(tx);
          unsettledTxs0.push(tx);
        }
        for (let i = 0; i < 5; ++i) {
          const tx = randomAccountTx({ userId, created: new Date(now + unsettledTxs0.length + i) });
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

    describe('DefiTx', () => {
      it('add defi tx to db and get it by tx id', async () => {
        const tx1 = randomDefiTx();
        await db.addDefiTx(tx1);
        const tx2 = randomDefiTx();
        await db.addDefiTx(tx2);

        expect(await db.getDefiTx(tx1.txId)).toEqual(tx1);
        expect(await db.getDefiTx(tx2.txId)).toEqual(tx2);
      });

      it('will override old data if try to add a defi tx with the same tx hash and user id', async () => {
        const tx = randomDefiTx();
        await db.addDefiTx(tx);

        const newTx = randomDefiTx({ txId: tx.txId, userId: tx.userId });
        await db.addDefiTx(newTx);

        const savedTx = await db.getDefiTx(tx.txId);
        expect(savedTx).toEqual(newTx);
      });

      it('update defi tx with interaction nonce and isAsync', async () => {
        const tx = randomDefiTx();
        await db.addDefiTx(tx);

        const savedTx = (await db.getDefiTx(tx.txId))!;
        expect(savedTx).toEqual(tx);

        const interactionNonce = 32;
        const isAsync = true;
        const settled = new Date(tx.created.getTime() + 1000);
        await db.settleDefiDeposit(tx.txId, interactionNonce, isAsync, settled);

        const settledTx = (await db.getDefiTx(tx.txId))!;
        expect(settledTx).toEqual({
          ...tx,
          interactionNonce,
          isAsync,
          settled,
        });
      });

      it('update defi tx with interaction result', async () => {
        const tx = randomDefiTx();
        await db.addDefiTx(tx);

        const savedTx = (await db.getDefiTx(tx.txId))!;
        expect(savedTx.outputValueA).toBe(undefined);
        expect(savedTx.outputValueB).toBe(undefined);
        expect(savedTx.settled).toBeFalsy();

        const outputValueA = 123n;
        const outputValueB = 456n;
        const success = true;
        const finalised = new Date(tx.created.getTime() + 123);
        await db.updateDefiTxFinalisationResult(tx.txId, success, outputValueA, outputValueB, finalised);

        const settledTx = (await db.getDefiTx(tx.txId))!;
        expect(settledTx).toEqual(
          expect.objectContaining({
            outputValueA,
            outputValueB,
            success,
            finalised,
          }),
        );
      });

      it('settle defi tx by tx hash', async () => {
        const tx = randomDefiTx();
        await db.addDefiTx(tx);

        const savedTx = (await db.getDefiTx(tx.txId))!;
        expect(savedTx.claimSettled).toBeFalsy();
        expect(savedTx.claimTxId).toBeFalsy();

        const settled = new Date();
        const claimTxId = TxId.random();
        await db.settleDefiTx(tx.txId, settled, claimTxId);

        const settledTx = (await db.getDefiTx(tx.txId))!;
        expect(settledTx.claimSettled).toEqual(settled);
        expect(settledTx.claimTxId).toEqual(claimTxId);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const userId0 = GrumpkinAddress.random();
        const userId1 = GrumpkinAddress.random();
        const settledTxs0: CoreDefiTx[] = [];
        const settledTxs1: CoreDefiTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomDefiTx({ userId: userId0, settled: new Date(now + i), interactionNonce: i });
          await db.addDefiTx(tx0);
          settledTxs0.push(tx0);

          const tx1 = randomDefiTx({ userId: userId1, settled: new Date(now - i), interactionNonce: i });
          await db.addDefiTx(tx1);
          settledTxs1.push(tx1);
        }

        expect(await db.getDefiTxs(userId0)).toEqual([...settledTxs0].reverse());
        expect(await db.getDefiTxs(userId1)).toEqual(settledTxs1);

        const unsettledTxs0: CoreDefiTx[] = [];
        const unsettledTxs1: CoreDefiTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomDefiTx({ userId: userId0, created: new Date(now - i), interactionNonce: i });
          await db.addDefiTx(tx0);
          unsettledTxs0.push(tx0);

          const tx1 = randomDefiTx({ userId: userId1, created: new Date(now + i), interactionNonce: i });
          await db.addDefiTx(tx1);
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
            await db.addDefiTx(tx);
            const settledTx = { ...tx, interactionNonce: i % 2, isAsync: !(i % 3), settled: new Date(now + 10 + i) };
            settledTxs0.push(settledTx);
            await db.settleDefiDeposit(tx.txId, settledTx.interactionNonce, settledTx.isAsync, settledTx.settled);
          }
          {
            const tx = randomDefiTx({ userId: userId1, created: new Date(now - i) });
            await db.addDefiTx(tx);
            const settledTx = { ...tx, interactionNonce: i % 2, isAsync: !(i % 3), settled: new Date(now + 10 - i) };
            settledTxs1.push(settledTx);
            await db.settleDefiDeposit(tx.txId, settledTx.interactionNonce, settledTx.isAsync, settledTx.settled);
          }
        }

        expect(await db.getDefiTxs(userId0)).toEqual([...settledTxs0].reverse());
        expect(await db.getDefiTxs(userId1)).toEqual(settledTxs1);

        expect(await db.getDefiTxsByNonce(userId0, 0)).toEqual(
          [...settledTxs0.filter(tx => tx.interactionNonce === 0)].reverse(),
        );
        expect(await db.getDefiTxsByNonce(userId1, 1)).toEqual(settledTxs1.filter(tx => tx.interactionNonce === 1));
      });
    });

    describe('ClaimTx', () => {
      it('add claim tx to db and get it by nullifier', async () => {
        const tx = randomClaimTx();
        await db.addClaimTx(tx);

        const savedClaim = await db.getClaimTx(tx.nullifier);
        expect(savedClaim).toEqual(tx);
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
          await db.addPaymentTx(tx);
          txs.push(tx);
          paymentTxs.push(tx);
        };
        const createAccountTx = async (settled = false) => {
          const tx = randomAccountTx({
            userId,
            created: new Date(now + txs.length),
            settled: settled ? new Date(now + txs.length) : undefined,
          });
          await db.addAccountTx(tx);
          txs.push(tx);
          accountTxs.push(tx);
        };
        const createDefiTx = async (settled = false) => {
          const tx = randomDefiTx({
            userId,
            created: new Date(now + txs.length),
            settled: settled ? new Date(now + txs.length) : undefined,
          });
          await db.addDefiTx(tx);
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
        await db.addPaymentTx(jsTx);
        const accountTx = randomAccountTx();
        await db.addAccountTx(accountTx);
        const defiTx = randomDefiTx();
        await db.addDefiTx(defiTx);

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
        await db.addPaymentTx(jsTx);
        const accountTx = randomAccountTx();
        await db.addAccountTx(accountTx);
        const defiTx = randomDefiTx();
        await db.addDefiTx(defiTx);

        expect(await db.isUserTxSettled(jsTx.txId)).toBe(false);
        expect(await db.isUserTxSettled(accountTx.txId)).toBe(false);
        expect(await db.isUserTxSettled(defiTx.txId)).toBe(false);

        await db.settlePaymentTx(jsTx.userId, jsTx.txId, new Date());
        await db.settleAccountTx(accountTx.txId, new Date());
        await db.settleDefiDeposit(defiTx.txId, 1, false, new Date());

        expect(await db.isUserTxSettled(jsTx.txId)).toBe(true);
        expect(await db.isUserTxSettled(accountTx.txId)).toBe(true);
        expect(await db.isUserTxSettled(defiTx.txId)).toBe(true);
      });

      it('return true only when all payment txs with the same txId are settled', async () => {
        const txs: CorePaymentTx[] = [];
        const txId = TxId.random();
        for (let i = 0; i < 5; ++i) {
          const tx = randomPaymentTx({ txId, settled: i ? new Date() : undefined });
          await db.addPaymentTx(tx);
          txs.push(tx);
        }

        expect(await db.isUserTxSettled(txId)).toBe(false);

        await db.settlePaymentTx(txs[0].userId, txId, new Date());

        expect(await db.isUserTxSettled(txId)).toBe(true);
      });

      it('get pending user txs', async () => {
        const pendingTxIdes: TxId[] = [];
        const userId = GrumpkinAddress.random();
        for (let i = 0; i < 10; ++i) {
          const jsTx = randomPaymentTx({ userId: i % 3 ? userId : GrumpkinAddress.random() });
          await db.addPaymentTx(jsTx);
          if (i % 2) {
            await db.settlePaymentTx(jsTx.userId, jsTx.txId, new Date());
          } else if (i % 3) {
            pendingTxIdes.push(jsTx.txId);
          }

          const accountTx = randomAccountTx({ userId: i % 3 ? userId : GrumpkinAddress.random() });
          await db.addAccountTx(accountTx);
          if (!(i % 2)) {
            await db.settleAccountTx(accountTx.txId, new Date());
          } else if (i % 3) {
            pendingTxIdes.push(accountTx.txId);
          }

          const defiTx = randomDefiTx({ userId: i % 3 ? userId : GrumpkinAddress.random() });
          await db.addDefiTx(defiTx);
          if (!(i % 2)) {
            await db.settleDefiDeposit(defiTx.txId, 12, false, new Date());
          } else if (i % 3) {
            pendingTxIdes.push(defiTx.txId);
          }
        }

        const txIdes = await db.getPendingUserTxs(userId);
        expect(txIdes.length).toBe(pendingTxIdes.length);
        expect(txIdes).toEqual(expect.arrayContaining(pendingTxIdes));
      });

      it('remove tx by txId and userId', async () => {
        const userA = GrumpkinAddress.random();
        const userB = GrumpkinAddress.random();

        const jsTx0 = randomPaymentTx({ userId: userA });
        await db.addPaymentTx(jsTx0);
        await db.addPaymentTx({ ...jsTx0, userId: userB });
        const jsTx1 = randomPaymentTx({ userId: userA });
        await db.addPaymentTx(jsTx1);
        await db.addPaymentTx({ ...jsTx1, userId: userB });

        const accountTx0 = randomAccountTx({ userId: userA });
        const accountTx1 = randomAccountTx({ userId: userB });
        await db.addAccountTx(accountTx0);
        await db.addAccountTx(accountTx1);

        const defiTx0 = randomDefiTx({ userId: userA });
        const defiTx1 = randomDefiTx({ userId: userB });
        await db.addDefiTx(defiTx0);
        await db.addDefiTx(defiTx1);

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
    });

    describe('Alias', () => {
      it('save alias and its account public key', async () => {
        const alias0 = randomAlias();
        await db.addAlias(alias0);
        const alias1 = randomAlias();
        await db.addAlias(alias1);
        const alias2 = { ...alias0, accountPublicKey: GrumpkinAddress.random() };
        await db.addAlias(alias2);

        expect(await db.getAlias(alias0.accountPublicKey)).toEqual(alias0);
        expect(await db.getAlias(alias2.accountPublicKey)).toEqual(alias2);
        const aliases = await db.getAliases(alias0.aliasHash);
        expect(aliases.length).toBe(2);
        expect(aliases).toEqual(expect.arrayContaining([alias0, alias2]));
        expect(await db.getAliases(alias1.aliasHash)).toEqual([alias1]);
        expect(await db.getAliases(AliasHash.random())).toEqual([]);
      });

      it('update alias with the same account public key', async () => {
        const alias1 = randomAlias();
        await db.addAlias(alias1);

        const alias2 = { ...alias1, accountPublicKey: GrumpkinAddress.random() };
        await db.addAlias(alias2);

        const updatedAlias = { ...alias1, index: 123 };
        await db.addAlias(updatedAlias);

        expect(await db.getAlias(alias1.accountPublicKey)).toEqual(updatedAlias);

        expect(await db.getAlias(alias2.accountPublicKey)).toEqual(alias2);
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

      it('get aliases with the same alias hash in descending order', async () => {
        const alias1 = randomAlias({ index: 1 });
        await db.addAlias(alias1);

        const alias2 = { ...alias1, accountPublicKey: GrumpkinAddress.random(), index: 2 };
        await db.addAlias(alias2);

        const alias3 = { ...alias1, accountPublicKey: GrumpkinAddress.random(), index: 0 };
        await db.addAlias(alias3);

        expect(await db.getAliases(alias1.aliasHash)).toEqual([alias2, alias1, alias3]);
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

    it('bulk saves spendingKeys', async () => {
      const keys = Array<SpendingKey>();
      const numKeys = 1000;
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

      [dbKey] = await db.getSpendingKeys(keys[999].userId);
      expect(dbKey).toEqual(keys[999]);
    });

    describe('Mutex', () => {
      const name = 'mutex-test';
      const timeout = 10000000;

      const sleep = async (time: number) => new Promise(resolve => setTimeout(resolve, time));

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
        expect(result).toEqual([true, false, false, false]);
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

        const spendingKey = randomSpendingKey({ userId: user.id });
        await db.addSpendingKey(spendingKey);

        const paymentTx = randomPaymentTx({ userId: user.id });
        await db.addPaymentTx(paymentTx);

        const accountTx = randomAccountTx({ userId: user.id });
        await db.addAccountTx(accountTx);

        return { user, note, spendingKey, paymentTx, accountTx };
      };

      it('remove all data of a user', async () => {
        const user0 = randomUser();
        const user1 = randomUser();
        const profile0 = await generateUserProfile(user0);
        const profile1 = await generateUserProfile(user1);

        await db.removeUser(user0.id);

        expect(await db.getUser(user0.id)).toBeUndefined();
        expect(await db.getNotes(user0.id)).toEqual([]);
        expect(await db.getNote(profile0.note.commitment)).toBeUndefined();
        expect(await db.getSpendingKeys(user0.id)).toEqual([]);
        expect(await db.getPaymentTxs(user0.id)).toEqual([]);
        expect(await db.getAccountTxs(user0.id)).toEqual([]);

        expect(await db.getUser(user1.id)).toEqual(profile1.user);
        expect(await db.getNotes(user1.id)).toEqual([profile1.note]);
        expect(await db.getNote(profile1.note.commitment)).toEqual(profile1.note);
        expect(await db.getSpendingKeys(user1.id)).toEqual([profile1.spendingKey]);
        expect(await db.getPaymentTxs(user1.id)).toEqual([profile1.paymentTx]);
        expect(await db.getAccountTxs(user1.id)).toEqual([profile1.accountTx]);
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
        await db.addPaymentTx(tx);

        const claim = randomClaimTx();
        await db.addClaimTx(claim);

        await db.resetUsers();

        expect(await db.getAlias(alias.accountPublicKey)).toEqual(alias);
        expect(await db.getNote(note.commitment)).toBeUndefined();
        expect(await db.getSpendingKey(spendingKey.userId, fullKey)).toBeUndefined();
        expect(await db.getPaymentTx(tx.userId, tx.txId)).toBeUndefined();
        expect(await db.getClaimTx(claim.nullifier)).toBeUndefined();
        expect(await db.getUser(user.id)).toEqual({
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
        await db.addPaymentTx(tx);

        await db.clear();

        expect(await db.getAlias(alias.accountPublicKey)).toBeUndefined();
        expect(await db.getNote(note.commitment)).toBeUndefined();
        expect(await db.getUser(user.id)).toBeUndefined();
        expect(await db.getKey(keyName)).toBeUndefined();
        expect(await db.getSpendingKey(spendingKey.userId, fullKey)).toBeUndefined();
        expect(await db.getPaymentTx(tx.userId, tx.txId)).toBeUndefined();
      });
    });
  });
};
