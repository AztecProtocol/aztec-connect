import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from 'crypto';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../../core_tx';
import { Note } from '../../note';
import { UserData } from '../../user';
import { Alias, Database, SigningKey } from '../database';
import {
  randomAccountTx,
  randomAlias,
  randomClaimTx,
  randomDefiTx,
  randomNote,
  randomPaymentTx,
  randomSigningKey,
  randomUser,
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
        const userId = AccountId.random();
        const userNotes: Note[] = [];
        for (let i = 0; i < 10; ++i) {
          const note = randomNote(undefined, { ownerPubKey: userId.publicKey, nonce: userId.accountNonce });
          await db.addNote(note);
          if (i % 3) {
            await db.nullifyNote(note.nullifier);
          } else {
            userNotes.push(note);
          }
        }
        for (let i = 0; i < 5; ++i) {
          const { publicKey, accountNonce } = AccountId.random();
          const note = randomNote(undefined, { ownerPubKey: publicKey, nonce: accountNonce });
          await db.addNote(note);
        }

        const savedNotes = await db.getUserNotes(userId);
        expect(savedNotes.length).toEqual(userNotes.length);
        expect(savedNotes).toEqual(expect.arrayContaining(userNotes));
      });

      it('get all pending notes belonging to a user', async () => {
        const userId = AccountId.random();
        const userPendingNotes: Note[] = [];
        for (let i = 0; i < 10; ++i) {
          const index = i % 2 ? i : undefined;
          const note = randomNote({ index }, { ownerPubKey: userId.publicKey, nonce: userId.accountNonce });
          if (index === undefined) {
            userPendingNotes.push(note);
          }
          await db.addNote(note);
        }
        for (let i = 0; i < 5; ++i) {
          const { publicKey, accountNonce } = AccountId.random();
          const note = randomNote(undefined, { ownerPubKey: publicKey, nonce: accountNonce });
          await db.addNote(note);
        }

        const savedNotes = await db.getUserPendingNotes(userId);
        expect(savedNotes.length).toEqual(userPendingNotes.length);
        expect(savedNotes).toEqual(expect.arrayContaining(userPendingNotes));
      });

      it('delete note by nullifier', async () => {
        const userId = AccountId.random();
        const notes: Note[] = [];
        for (let i = 0; i < 5; ++i) {
          const note = randomNote(undefined, { ownerPubKey: userId.publicKey, nonce: userId.accountNonce });
          await db.addNote(note);
          notes.push(note);
        }

        {
          const savedNotes = await db.getUserNotes(userId);
          expect(savedNotes.length).toEqual(5);
          expect(savedNotes).toEqual(expect.arrayContaining(notes));
        }

        await db.removeNote(notes[1].nullifier);
        await db.removeNote(notes[3].nullifier);

        {
          const savedNotes = await db.getUserNotes(userId);
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

    describe('PaymentTx', () => {
      it('add payment tx to db and get it by user id and tx hash', async () => {
        const tx = randomPaymentTx();
        await db.addPaymentTx(tx);

        const newUserId = AccountId.random();
        const sharedTx = { ...tx, userId: newUserId };
        await db.addPaymentTx(sharedTx);

        const savedTx = await db.getPaymentTx(tx.txId, tx.userId);
        expect(savedTx).toEqual(tx);

        const newTx = await db.getPaymentTx(tx.txId, newUserId);
        expect(newTx).toEqual(sharedTx);
      });

      it('will override old data if try to add a user tx with the same user id and tx hash combination', async () => {
        const tx = randomPaymentTx();
        await db.addPaymentTx(tx);

        const newTx = randomPaymentTx({ userId: tx.userId, txId: tx.txId });
        await db.addPaymentTx(newTx);

        const savedTx = await db.getPaymentTx(tx.txId, tx.userId);
        expect(savedTx).toEqual(newTx);
      });

      it('settle payment tx for specific user', async () => {
        const tx = randomPaymentTx();

        const userId0 = AccountId.random();
        await db.addPaymentTx({ ...tx, userId: userId0 });

        const userId1 = AccountId.random();
        await db.addPaymentTx({ ...tx, userId: userId1 });

        const settled = new Date();
        await db.settlePaymentTx(tx.txId, userId0, settled);

        const tx0 = await db.getPaymentTx(tx.txId, userId0);
        expect(tx0!.settled).toEqual(settled);

        const tx1 = await db.getPaymentTx(tx.txId, userId1);
        expect(tx1!.settled).toEqual(undefined);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const userId0 = AccountId.random();
        const userId1 = AccountId.random();
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
        const userId = AccountId.random();
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
        const userId0 = AccountId.random();
        const userId1 = AccountId.random();
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
        const userId0 = AccountId.random();
        const userId1 = AccountId.random();
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
        const userId = AccountId.random();
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

        expect(await db.getPaymentTx(jsTx.txId, jsTx.userId)).toEqual(jsTx);
        expect(await db.getPaymentTx(accountTx.txId, accountTx.userId)).toBe(undefined);
        expect(await db.getPaymentTx(defiTx.txId, defiTx.userId)).toBe(undefined);

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

        await db.settlePaymentTx(jsTx.txId, jsTx.userId, new Date());
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

        await db.settlePaymentTx(txId, txs[0].userId, new Date());

        expect(await db.isUserTxSettled(txId)).toBe(true);
      });

      it('get pending user txs', async () => {
        const pendingTxIdes: TxId[] = [];
        const userId = AccountId.random();
        for (let i = 0; i < 10; ++i) {
          const jsTx = randomPaymentTx({ userId: i % 3 ? userId : AccountId.random() });
          await db.addPaymentTx(jsTx);
          if (i % 2) {
            await db.settlePaymentTx(jsTx.txId, jsTx.userId, new Date());
          } else if (i % 3) {
            pendingTxIdes.push(jsTx.txId);
          }

          const accountTx = randomAccountTx({ userId: i % 3 ? userId : AccountId.random() });
          await db.addAccountTx(accountTx);
          if (!(i % 2)) {
            await db.settleAccountTx(accountTx.txId, new Date());
          } else if (i % 3) {
            pendingTxIdes.push(accountTx.txId);
          }

          const defiTx = randomDefiTx({ userId: i % 3 ? userId : AccountId.random() });
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
        const userA = AccountId.random();
        const userB = AccountId.random();

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

        await db.removeUserTx(jsTx0.txId, userA);
        await db.removeUserTx(jsTx1.txId, userB);
        await db.removeUserTx(accountTx0.txId, userA);
        await db.removeUserTx(defiTx0.txId, userA);

        expect(await db.getPaymentTxs(userA)).toEqual([expect.objectContaining({ ...jsTx1, userId: userA })]);
        expect(await db.getPaymentTxs(userB)).toEqual([expect.objectContaining({ ...jsTx0, userId: userB })]);
        expect(await db.getAccountTxs(userA)).toEqual([]);
        expect(await db.getAccountTxs(userB)).toEqual([accountTx1]);
        expect(await db.getDefiTxs(userA)).toEqual([]);
        expect(await db.getDefiTxs(userB)).toEqual([defiTx1]);
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

      it('retrieve a signing key', async () => {
        const accountId = AccountId.random();
        const signingKey = randomSigningKey();
        signingKey.accountId = accountId;
        await db.addUserSigningKey(signingKey);

        const fullKey = new GrumpkinAddress(Buffer.concat([signingKey.key, randomBytes(32)]));
        const key1 = await db.getUserSigningKey(accountId, fullKey);
        expect(key1).toEqual(signingKey);

        const key2 = await db.getUserSigningKey(AccountId.random(), fullKey);
        expect(key2).toBeUndefined();
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

      it('bulk saves aliases', async () => {
        const aliases = Array<Alias>();
        const numAliases = 1000;
        for (let i = 0; i < numAliases; i++) {
          aliases.push(randomAlias());
        }
        await db.setAliases(aliases);

        let dbAlias = await db.getAlias(aliases[0].aliasHash, aliases[0].address);
        expect(dbAlias).toEqual(aliases[0]);

        dbAlias = await db.getAlias(aliases[1].aliasHash, aliases[1].address);
        expect(dbAlias).toEqual(aliases[1]);

        dbAlias = await db.getAlias(aliases[100].aliasHash, aliases[100].address);
        expect(dbAlias).toEqual(aliases[100]);

        dbAlias = await db.getAlias(aliases[101].aliasHash, aliases[101].address);
        expect(dbAlias).toEqual(aliases[101]);

        dbAlias = await db.getAlias(aliases[999].aliasHash, aliases[999].address);
        expect(dbAlias).toEqual(aliases[999]);
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

      it('get account id by alias hash and an optional nonce', async () => {
        const alias = randomAlias();
        const publicKeys = [...Array(3)].map(() => GrumpkinAddress.randomAddress());
        await db.setAlias({
          ...alias,
          address: publicKeys[0],
          latestNonce: 1,
        });
        await db.setAlias({
          ...alias,
          address: publicKeys[1],
          latestNonce: 2,
        });
        await db.setAlias({
          ...alias,
          address: publicKeys[2],
          latestNonce: 4,
        });

        const alias2 = randomAlias();
        await db.setAlias({
          ...alias2,
          address: publicKeys[1],
          latestNonce: 7,
        });

        expect(await db.getAccountId(alias.aliasHash)).toEqual(new AccountId(publicKeys[2], 4));
        expect(await db.getAccountId(alias.aliasHash, 0)).toEqual(new AccountId(publicKeys[0], 0));
        expect(await db.getAccountId(alias.aliasHash, 1)).toEqual(new AccountId(publicKeys[0], 1));
        expect(await db.getAccountId(alias.aliasHash, 2)).toEqual(new AccountId(publicKeys[1], 2));
        expect(await db.getAccountId(alias.aliasHash, 3)).toEqual(new AccountId(publicKeys[2], 3));
        expect(await db.getAccountId(alias.aliasHash, 4)).toEqual(new AccountId(publicKeys[2], 4));
        expect(await db.getAccountId(alias.aliasHash, 5)).toBe(undefined);

        expect(await db.getAccountId(alias2.aliasHash)).toEqual(new AccountId(publicKeys[1], 7));

        expect(await db.getAccountId(AliasHash.random())).toBe(undefined);
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

    it('bulk saves signingKeys', async () => {
      const keys = Array<SigningKey>();
      const numKeys = 1000;
      for (let i = 0; i < numKeys; i++) {
        keys.push(randomSigningKey());
      }
      await db.addUserSigningKeys(keys);

      let [dbKey] = await db.getUserSigningKeys(keys[0].accountId);
      expect(dbKey).toEqual(keys[0]);

      [dbKey] = await db.getUserSigningKeys(keys[1].accountId);
      expect(dbKey).toEqual(keys[1]);

      [dbKey] = await db.getUserSigningKeys(keys[100].accountId);
      expect(dbKey).toEqual(keys[100]);

      [dbKey] = await db.getUserSigningKeys(keys[101].accountId);
      expect(dbKey).toEqual(keys[101]);

      [dbKey] = await db.getUserSigningKeys(keys[999].accountId);
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

        const note = randomNote(undefined, { ownerPubKey: user.publicKey, nonce: user.nonce });
        await db.addNote(note);

        const signingKey = randomSigningKey();
        signingKey.accountId = user.id;
        await db.addUserSigningKey(signingKey);

        const paymentTx = randomPaymentTx({ userId: user.id });
        await db.addPaymentTx(paymentTx);

        const accountTx = randomAccountTx({ userId: user.id });
        await db.addAccountTx(accountTx);

        return { user, note, signingKey, paymentTx, accountTx };
      };

      it('remove all data of a user', async () => {
        const user0 = randomUser();
        const user1 = randomUser();
        const profile0 = await generateUserProfile(user0);
        const profile1 = await generateUserProfile(user1);

        await db.removeUser(user0.id);

        expect(await db.getUser(user0.id)).toBeUndefined();
        expect(await db.getUserNotes(user0.id)).toEqual([]);
        expect(await db.getNote(profile0.note.commitment)).toBeUndefined();
        expect(await db.getUserSigningKeys(user0.id)).toEqual([]);
        expect(await db.getPaymentTxs(user0.id)).toEqual([]);
        expect(await db.getAccountTxs(user0.id)).toEqual([]);

        expect(await db.getUser(user1.id)).toEqual(profile1.user);
        expect(await db.getUserNotes(user1.id)).toEqual([profile1.note]);
        expect(await db.getNote(profile1.note.commitment)).toEqual(profile1.note);
        expect(await db.getUserSigningKeys(user1.id)).toEqual([profile1.signingKey]);
        expect(await db.getPaymentTxs(user1.id)).toEqual([profile1.paymentTx]);
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
        expect(await db.getNote(profile0.note.commitment)).toBeUndefined();
        expect(await db.getUserSigningKeys(user0.id)).toEqual([]);
        expect(await db.getPaymentTxs(user0.id)).toEqual([]);
        expect(await db.getAccountTxs(user0.id)).toEqual([]);

        expect(await db.getUser(user1.id)).toEqual(profile1.user);
        expect(await db.getUserNotes(user1.id)).toEqual([profile1.note]);
        expect(await db.getNote(profile1.note.commitment)).toEqual(profile1.note);
        expect(await db.getUserSigningKeys(user1.id)).toEqual([profile1.signingKey]);
        expect(await db.getPaymentTxs(user1.id)).toEqual([profile1.paymentTx]);
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

        const tx = randomPaymentTx();
        await db.addPaymentTx(tx);

        await db.resetUsers();

        expect(await db.getAliases(alias.aliasHash)).toEqual([]);
        expect(await db.getNote(note.commitment)).toBeUndefined();
        expect(await db.getUserSigningKey(signingKey.accountId, fullKey)).toBeUndefined();
        expect(await db.getPaymentTx(tx.txId, tx.userId)).toBeUndefined();

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

        const tx = randomPaymentTx();
        await db.addPaymentTx(tx);

        await db.clear();

        expect(await db.getAliases(alias.aliasHash)).toEqual([]);
        expect(await db.getNote(note.commitment)).toBeUndefined();
        expect(await db.getUser(user.id)).toBeUndefined();
        expect(await db.getKey(keyName)).toBeUndefined();
        expect(await db.getUserSigningKey(signingKey.accountId, fullKey)).toBeUndefined();
        expect(await db.getPaymentTx(tx.txId, tx.userId)).toBeUndefined();
      });
    });
  });
};
