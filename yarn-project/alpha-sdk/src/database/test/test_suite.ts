import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { sleep } from '@aztec/barretenberg/sleep';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from 'crypto';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx } from '../../core_tx/index.js';
import { Note } from '../../note/index.js';
import { AccountData, Alias, Database, SpendingKey } from '../database.js';
import {
  randomAccountTx,
  randomAlias,
  randomClaimTx,
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
        const accountPublicKey = GrumpkinAddress.random();
        const userNotes: Note[] = [];
        for (let i = 0; i < 10; ++i) {
          const note = randomNote(undefined, { ownerPubKey: accountPublicKey });
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

        const savedNotes = await db.getNotes(accountPublicKey);
        expect(savedNotes.length).toEqual(userNotes.length);
        expect(savedNotes).toEqual(expect.arrayContaining(userNotes));
      });

      it('get all pending notes belonging to a user', async () => {
        const accountPublicKey = GrumpkinAddress.random();
        const userPendingNotes: Note[] = [];
        for (let i = 0; i < 10; ++i) {
          const index = i % 2 ? i : undefined;
          const note = randomNote({ index }, { ownerPubKey: accountPublicKey });
          if (index === undefined) {
            userPendingNotes.push(note);
          }
          await db.addNote(note);
        }
        for (let i = 0; i < 5; ++i) {
          const note = randomNote(undefined, { ownerPubKey: GrumpkinAddress.random() });
          await db.addNote(note);
        }

        const savedNotes = await db.getPendingNotes(accountPublicKey);
        expect(savedNotes.length).toEqual(userPendingNotes.length);
        expect(savedNotes).toEqual(expect.arrayContaining(userPendingNotes));
      });

      it('delete note by nullifier', async () => {
        const accountPublicKey = GrumpkinAddress.random();
        const notes: Note[] = [];
        for (let i = 0; i < 5; ++i) {
          const note = randomNote(undefined, { ownerPubKey: accountPublicKey });
          await db.addNote(note);
          notes.push(note);
        }

        {
          const savedNotes = await db.getNotes(accountPublicKey);
          expect(savedNotes.length).toEqual(5);
          expect(savedNotes).toEqual(expect.arrayContaining(notes));
        }

        await db.removeNote(notes[1].nullifier);
        await db.removeNote(notes[3].nullifier);

        {
          const savedNotes = await db.getNotes(accountPublicKey);
          expect(savedNotes.length).toEqual(3);
          expect(savedNotes).toEqual(expect.arrayContaining([notes[0], notes[2], notes[4]]));
        }
      });
    });

    describe('Account', () => {
      it('add account to db and get it by id', async () => {
        const user = randomUser();
        await db.addAccount(user);

        const savedUser = await db.getAccount(user.accountPublicKey);
        expect(savedUser).toEqual(user);
      });

      it('get all users', async () => {
        const users: AccountData[] = [];
        for (let i = 0; i < 5; ++i) {
          const user = randomUser();
          await db.addAccount(user);
          users.push(user);
        }
        const savedUsers = await db.getAccounts();
        expect(savedUsers.length).toBe(users.length);
        expect(savedUsers).toEqual(expect.arrayContaining(users));
      });

      it('update data for an existing user', async () => {
        const user = randomUser();
        await db.addAccount(user);

        const newUser = { ...user, syncedToRollup: user.syncedToRollup + 1 };
        await db.addAccount(newUser);

        const updatedUser = await db.getAccount(user.accountPublicKey);
        expect(updatedUser).toEqual(newUser);
      });
    });

    describe('PaymentTx', () => {
      it('add payment tx to db and get it by user id and tx hash', async () => {
        const tx = randomPaymentTx();
        await db.addPaymentTx(tx);

        const newaccountPublicKey = GrumpkinAddress.random();
        const sharedTx = { ...tx, accountPublicKey: newaccountPublicKey };
        await db.addPaymentTx(sharedTx);

        const savedTx = await db.getPaymentTx(tx.accountPublicKey, tx.txId);
        expect(savedTx).toEqual(tx);

        const newTx = await db.getPaymentTx(newaccountPublicKey, tx.txId);
        expect(newTx).toEqual(sharedTx);
      });

      it('will override old data if try to add a user tx with the same user id and tx hash combination', async () => {
        const tx = randomPaymentTx({ settled: undefined });
        await db.addPaymentTx(tx);

        const newaccountPublicKey = GrumpkinAddress.random();
        const newTx = { ...tx, accountPublicKey: newaccountPublicKey, txId: tx.txId };
        await db.addPaymentTx(newTx);

        const settledTx = { ...tx, accountPublicKey: tx.accountPublicKey, txId: tx.txId, settled: new Date() };
        await db.addPaymentTx(settledTx);

        {
          const savedTx = await db.getPaymentTx(newaccountPublicKey, tx.txId);
          expect(savedTx).toEqual(newTx);
        }
        {
          const savedTx = await db.getPaymentTx(tx.accountPublicKey, tx.txId);
          expect(savedTx).toEqual(settledTx);
        }
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const accountPublicKey0 = GrumpkinAddress.random();
        const accountPublicKey1 = GrumpkinAddress.random();
        const settledTxs0: CorePaymentTx[] = [];
        const settledTxs1: CorePaymentTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomPaymentTx({ accountPublicKey: accountPublicKey0, settled: new Date(now + i) });
          await db.addPaymentTx(tx0);
          settledTxs0.push(tx0);

          const tx1 = randomPaymentTx({ accountPublicKey: accountPublicKey1, settled: new Date(now - i) });
          await db.addPaymentTx(tx1);
          settledTxs1.push(tx1);
        }

        expect(await db.getPaymentTxs(accountPublicKey0)).toEqual([...settledTxs0].reverse());
        expect(await db.getPaymentTxs(accountPublicKey1)).toEqual(settledTxs1);

        const unsettledTxs0: CorePaymentTx[] = [];
        const unsettledTxs1: CorePaymentTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomPaymentTx({ accountPublicKey: accountPublicKey0, created: new Date(now - i) });
          await db.addPaymentTx(tx0);
          unsettledTxs0.push(tx0);

          const tx1 = randomPaymentTx({ accountPublicKey: accountPublicKey1, created: new Date(now + i) });
          await db.addPaymentTx(tx1);
          unsettledTxs1.push(tx1);
        }

        expect(await db.getPaymentTxs(accountPublicKey0)).toEqual(unsettledTxs0.concat([...settledTxs0].reverse()));
        expect(await db.getPaymentTxs(accountPublicKey1)).toEqual([...unsettledTxs1].reverse().concat(settledTxs1));
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

        const newTx = randomAccountTx({ txId: tx.txId, accountPublicKey: tx.accountPublicKey });
        await db.addAccountTx(newTx);

        const savedTx = await db.getAccountTx(tx.txId);
        expect(savedTx).toEqual(newTx);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const accountPublicKey = GrumpkinAddress.random();
        const txs: CoreAccountTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx = randomAccountTx({ accountPublicKey, created: new Date(now + i), settled: new Date(now + i) });
          await db.addAccountTx(tx);
          txs.push(tx);

          const tx2 = randomAccountTx();
          await db.addAccountTx(tx2);
        }

        expect(await db.getAccountTxs(accountPublicKey)).toEqual([...txs].reverse());

        const unsettledTxs0: CoreAccountTx[] = [];
        const unsettledTxs1: CoreAccountTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx = randomAccountTx({ accountPublicKey, created: new Date(now - i) });
          await db.addAccountTx(tx);
          unsettledTxs0.push(tx);
        }
        for (let i = 0; i < 5; ++i) {
          const tx = randomAccountTx({ accountPublicKey, created: new Date(now + unsettledTxs0.length + i) });
          await db.addAccountTx(tx);
          unsettledTxs1.push(tx);
        }

        expect(await db.getAccountTxs(accountPublicKey)).toEqual([
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
        const txId = TxId.random();
        const accountPublicKey = GrumpkinAddress.random();

        const tx = randomDefiTx({ txId, accountPublicKey });
        await db.addDefiTx(tx);
        expect(await db.getDefiTx(txId)).toEqual(tx);

        const newTx = randomDefiTx({ txId, accountPublicKey });
        await db.addDefiTx(newTx);
        expect(await db.getDefiTx(txId)).toEqual(newTx);

        const settledTx = randomDefiTx({
          txId,
          accountPublicKey,
          settled: new Date(),
          interactionNonce: 123,
          isAsync: true,
          success: true,
          outputValueA: 56n,
          outputValueB: 78n,
          finalised: new Date(),
          claimSettled: new Date(),
          claimTxId: TxId.random(),
        });
        await db.addDefiTx(settledTx);
        expect(await db.getDefiTx(txId)).toEqual(settledTx);
      });

      it('get all txs for a user from newest to oldest with unsettled txs first', async () => {
        const accountPublicKey0 = GrumpkinAddress.random();
        const accountPublicKey1 = GrumpkinAddress.random();
        const settledTxs0: CoreDefiTx[] = [];
        const settledTxs1: CoreDefiTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomDefiTx({
            accountPublicKey: accountPublicKey0,
            settled: new Date(now + i),
            interactionNonce: i,
          });
          await db.addDefiTx(tx0);
          settledTxs0.push(tx0);

          const tx1 = randomDefiTx({
            accountPublicKey: accountPublicKey1,
            settled: new Date(now - i),
            interactionNonce: i,
          });
          await db.addDefiTx(tx1);
          settledTxs1.push(tx1);
        }

        expect(await db.getDefiTxs(accountPublicKey0)).toEqual([...settledTxs0].reverse());
        expect(await db.getDefiTxs(accountPublicKey1)).toEqual(settledTxs1);

        const unsettledTxs0: CoreDefiTx[] = [];
        const unsettledTxs1: CoreDefiTx[] = [];
        for (let i = 0; i < 5; ++i) {
          const tx0 = randomDefiTx({
            accountPublicKey: accountPublicKey0,
            created: new Date(now - i),
            interactionNonce: i,
          });
          await db.addDefiTx(tx0);
          unsettledTxs0.push(tx0);

          const tx1 = randomDefiTx({
            accountPublicKey: accountPublicKey1,
            created: new Date(now + i),
            interactionNonce: i,
          });
          await db.addDefiTx(tx1);
          unsettledTxs1.push(tx1);
        }

        expect(await db.getDefiTxs(accountPublicKey0)).toEqual(unsettledTxs0.concat([...settledTxs0].reverse()));
        expect(await db.getDefiTxs(accountPublicKey1)).toEqual([...unsettledTxs1].reverse().concat(settledTxs1));
      });

      it('get all defi txs by nonce', async () => {
        const accountPublicKey0 = GrumpkinAddress.random();
        const accountPublicKey1 = GrumpkinAddress.random();
        const settledTxs0: CoreDefiTx[] = [];
        const settledTxs1: CoreDefiTx[] = [];
        const now = Date.now();
        for (let i = 0; i < 10; ++i) {
          {
            const tx = randomDefiTx({
              accountPublicKey: accountPublicKey0,
              created: new Date(now + i),
              interactionNonce: i % 2,
              isAsync: !(i % 3),
              settled: new Date(now + 10 + i),
            });
            settledTxs0.push(tx);
            await db.addDefiTx(tx);
          }
          {
            const tx = randomDefiTx({
              accountPublicKey: accountPublicKey1,
              created: new Date(now - i),
              interactionNonce: i % 2,
              isAsync: !(i % 3),
              settled: new Date(now + 10 - i),
            });
            settledTxs1.push(tx);
            await db.addDefiTx(tx);
          }
        }

        expect(await db.getDefiTxs(accountPublicKey0)).toEqual([...settledTxs0].reverse());
        expect(await db.getDefiTxs(accountPublicKey1)).toEqual(settledTxs1);

        expect(await db.getDefiTxsByNonce(accountPublicKey0, 0)).toEqual(
          [...settledTxs0.filter(tx => tx.interactionNonce === 0)].reverse(),
        );
        expect(await db.getDefiTxsByNonce(accountPublicKey1, 1)).toEqual(
          settledTxs1.filter(tx => tx.interactionNonce === 1),
        );
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
        const accountPublicKey = GrumpkinAddress.random();
        const txs: CoreUserTx[] = [];
        const paymentTxs: CorePaymentTx[] = [];
        const accountTxs: CoreAccountTx[] = [];
        const defiTxs: CoreDefiTx[] = [];
        const now = Date.now();
        const createPaymentTx = async (settled = false) => {
          const tx = randomPaymentTx({
            accountPublicKey,
            created: new Date(now + txs.length),
            settled: settled ? new Date(now + txs.length) : undefined,
          });
          await db.addPaymentTx(tx);
          txs.push(tx);
          paymentTxs.push(tx);
        };
        const createAccountTx = async (settled = false) => {
          const tx = randomAccountTx({
            accountPublicKey,
            created: new Date(now + txs.length),
            settled: settled ? new Date(now + txs.length) : undefined,
          });
          await db.addAccountTx(tx);
          txs.push(tx);
          accountTxs.push(tx);
        };
        const createDefiTx = async (settled = false) => {
          const tx = randomDefiTx({
            accountPublicKey,
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

        expect(await db.getTxs(accountPublicKey)).toEqual([...txs].reverse());
        expect(await db.getPaymentTxs(accountPublicKey)).toEqual([...paymentTxs].reverse());
        expect(await db.getAccountTxs(accountPublicKey)).toEqual([...accountTxs].reverse());
        expect(await db.getDefiTxs(accountPublicKey)).toEqual([...defiTxs].reverse());
      });

      it('only return a tx with the correct type', async () => {
        const jsTx = randomPaymentTx();
        await db.addPaymentTx(jsTx);
        const accountTx = randomAccountTx();
        await db.addAccountTx(accountTx);
        const defiTx = randomDefiTx();
        await db.addDefiTx(defiTx);

        expect(await db.getPaymentTx(jsTx.accountPublicKey, jsTx.txId)).toEqual(jsTx);
        expect(await db.getPaymentTx(accountTx.accountPublicKey, accountTx.txId)).toBe(undefined);
        expect(await db.getPaymentTx(defiTx.accountPublicKey, defiTx.txId)).toBe(undefined);

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

        expect(await db.isTxSettled(jsTx.txId)).toBe(false);
        expect(await db.isTxSettled(accountTx.txId)).toBe(false);
        expect(await db.isTxSettled(defiTx.txId)).toBe(false);

        await db.addPaymentTx({ ...jsTx, settled: new Date() });
        await db.addAccountTx({ ...accountTx, settled: new Date() });
        await db.addDefiTx({ ...defiTx, settled: new Date() });

        expect(await db.isTxSettled(jsTx.txId)).toBe(true);
        expect(await db.isTxSettled(accountTx.txId)).toBe(true);
        expect(await db.isTxSettled(defiTx.txId)).toBe(true);
      });

      it('return true only when all payment txs with the same txId are settled', async () => {
        const txs: CorePaymentTx[] = [];
        const txId = TxId.random();
        for (let i = 0; i < 5; ++i) {
          const tx = randomPaymentTx({ txId, settled: i ? new Date() : undefined }); // txs[0] is not settled
          await db.addPaymentTx(tx);
          txs.push(tx);
        }

        expect(await db.isTxSettled(txId)).toBe(false);

        await db.addPaymentTx({ ...txs[0], settled: new Date() });

        expect(await db.isTxSettled(txId)).toBe(true);
      });

      it('get pending user txs', async () => {
        const pendingTxIdes: TxId[] = [];
        const accountPublicKey = GrumpkinAddress.random();
        for (let i = 0; i < 10; ++i) {
          const jsTx = randomPaymentTx({ accountPublicKey: i % 3 ? accountPublicKey : GrumpkinAddress.random() });
          await db.addPaymentTx(jsTx);
          if (i % 2) {
            await db.addPaymentTx({ ...jsTx, settled: new Date() });
          } else if (i % 3) {
            pendingTxIdes.push(jsTx.txId);
          }

          const accountTx = randomAccountTx({ accountPublicKey: i % 3 ? accountPublicKey : GrumpkinAddress.random() });
          await db.addAccountTx(accountTx);
          if (!(i % 2)) {
            await db.addAccountTx({ ...accountTx, settled: new Date() });
          } else if (i % 3) {
            pendingTxIdes.push(accountTx.txId);
          }

          const defiTx = randomDefiTx({ accountPublicKey: i % 3 ? accountPublicKey : GrumpkinAddress.random() });
          await db.addDefiTx(defiTx);
          if (!(i % 2)) {
            await db.addDefiTx({ ...defiTx, settled: new Date() });
          } else if (i % 3) {
            pendingTxIdes.push(defiTx.txId);
          }
        }

        const txIdes = await db.getPendingTxs(accountPublicKey);
        expect(txIdes.length).toBe(pendingTxIdes.length);
        expect(txIdes).toEqual(expect.arrayContaining(pendingTxIdes));
      });

      it('remove tx by txId and accountPublicKey', async () => {
        const userA = GrumpkinAddress.random();
        const userB = GrumpkinAddress.random();

        const jsTx0 = randomPaymentTx({ accountPublicKey: userA });
        await db.addPaymentTx(jsTx0);
        await db.addPaymentTx({ ...jsTx0, accountPublicKey: userB });
        const jsTx1 = randomPaymentTx({ accountPublicKey: userA });
        await db.addPaymentTx(jsTx1);
        await db.addPaymentTx({ ...jsTx1, accountPublicKey: userB });

        const accountTx0 = randomAccountTx({ accountPublicKey: userA });
        const accountTx1 = randomAccountTx({ accountPublicKey: userB });
        await db.addAccountTx(accountTx0);
        await db.addAccountTx(accountTx1);

        const defiTx0 = randomDefiTx({ accountPublicKey: userA });
        const defiTx1 = randomDefiTx({ accountPublicKey: userB });
        await db.addDefiTx(defiTx0);
        await db.addDefiTx(defiTx1);

        await db.removeTx(userA, jsTx0.txId);
        await db.removeTx(userB, jsTx1.txId);
        await db.removeTx(userA, accountTx0.txId);
        await db.removeTx(userA, defiTx0.txId);

        expect(await db.getPaymentTxs(userA)).toEqual([expect.objectContaining({ ...jsTx1, accountPublicKey: userA })]);
        expect(await db.getPaymentTxs(userB)).toEqual([expect.objectContaining({ ...jsTx0, accountPublicKey: userB })]);
        expect(await db.getAccountTxs(userA)).toEqual([]);
        expect(await db.getAccountTxs(userB)).toEqual([accountTx1]);
        expect(await db.getDefiTxs(userA)).toEqual([]);
        expect(await db.getDefiTxs(userB)).toEqual([defiTx1]);
      });
    });

    describe('SpendingKey', () => {
      it('add spending key and get all keys for a user', async () => {
        const accountPublicKey = GrumpkinAddress.random();
        const keys: SpendingKey[] = [];
        for (let i = 0; i < 3; ++i) {
          const spendingKey = randomSpendingKey({ accountPublicKey });
          await db.addSpendingKey(spendingKey);
          keys.push(spendingKey);
        }
        for (let i = 0; i < 5; ++i) {
          const spendingKey = randomSpendingKey();
          await db.addSpendingKey(spendingKey);
        }

        const savedSpendingKeys = await db.getSpendingKeys(accountPublicKey);
        expect(savedSpendingKeys.length).toEqual(keys.length);
        expect(savedSpendingKeys).toEqual(expect.arrayContaining(keys));
      });

      it('override the existing data when adding spending keys with the same accountPublicKey and key', async () => {
        const accountPublicKey = GrumpkinAddress.random();
        const key1 = randomSpendingKey({ accountPublicKey });

        await db.addSpendingKey(key1);
        expect(await db.getSpendingKeys(accountPublicKey)).toEqual([key1]);

        const key2 = { ...key1, treeIndex: key1.treeIndex + 1 };
        await db.addSpendingKey(key2);
        expect(await db.getSpendingKeys(accountPublicKey)).toEqual([key2]);

        const key3 = { ...key1, accountPublicKey: GrumpkinAddress.random() };
        await db.addSpendingKey(key3);
        expect(await db.getSpendingKeys(accountPublicKey)).toEqual([key2]);

        const key4 = { ...key1, key: randomBytes(32) };
        await db.addSpendingKey(key4);

        const savedKeys = await db.getSpendingKeys(accountPublicKey);
        expect(savedKeys.length).toBe(2);
        expect(savedKeys).toEqual(expect.arrayContaining([key2, key4]));
      });

      it('writing duplicate spending keys does not error', async () => {
        const accountPublicKey = GrumpkinAddress.random();
        const key1 = randomSpendingKey({ accountPublicKey });
        const key2 = { ...randomSpendingKey({ accountPublicKey }), treeIndex: key1.treeIndex + 1 };

        await db.addSpendingKeys([key1, key2]);
        await expect(db.addSpendingKeys([key1, key2])).resolves.not.toThrow();

        const savedKeys = await db.getSpendingKeys(accountPublicKey);
        expect(savedKeys.length).toBe(2);
        expect(savedKeys).toEqual(expect.arrayContaining([key1, key2]));
      });

      it('remove all spending keys of given user id', async () => {
        const generateAccountSpendingKeys = async (accountPublicKey: GrumpkinAddress, numKeys = 3) => {
          const keys: SpendingKey[] = [];
          for (let i = 0; i < numKeys; ++i) {
            const spendingKey = randomSpendingKey({ accountPublicKey });
            await db.addSpendingKey(spendingKey);
            keys.push(spendingKey);
          }
          return keys;
        };

        const accountPublicKey0 = GrumpkinAddress.random();
        const accountPublicKey1 = GrumpkinAddress.random();
        const keys0 = await generateAccountSpendingKeys(accountPublicKey0);
        const keys1 = await generateAccountSpendingKeys(accountPublicKey1);

        const savedSpendingKeys0 = await db.getSpendingKeys(accountPublicKey0);
        expect(savedSpendingKeys0.length).toBe(keys0.length);
        expect(savedSpendingKeys0).toEqual(expect.arrayContaining(keys0));

        await db.removeSpendingKeys(accountPublicKey0);

        expect(await db.getSpendingKeys(accountPublicKey0)).toEqual([]);

        const savedSpendingKeys1 = await db.getSpendingKeys(accountPublicKey1);
        expect(savedSpendingKeys1.length).toBe(keys1.length);
        expect(savedSpendingKeys1).toEqual(expect.arrayContaining(keys1));
      });

      it('retrieve a spending key', async () => {
        const accountPublicKey = GrumpkinAddress.random();
        const spendingKey = randomSpendingKey();
        spendingKey.accountPublicKey = accountPublicKey;
        await db.addSpendingKey(spendingKey);

        const fullKey = new GrumpkinAddress(Buffer.concat([spendingKey.key, randomBytes(32)]));
        const key1 = await db.getSpendingKey(accountPublicKey, fullKey);
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

        let [dbKey] = await db.getSpendingKeys(keys[0].accountPublicKey);
        expect(dbKey).toEqual(keys[0]);

        [dbKey] = await db.getSpendingKeys(keys[1].accountPublicKey);
        expect(dbKey).toEqual(keys[1]);

        [dbKey] = await db.getSpendingKeys(keys[100].accountPublicKey);
        expect(dbKey).toEqual(keys[100]);

        [dbKey] = await db.getSpendingKeys(keys[101].accountPublicKey);
        expect(dbKey).toEqual(keys[101]);

        [dbKey] = await db.getSpendingKeys(keys[numKeys - 1].accountPublicKey);
        expect(dbKey).toEqual(keys[numKeys - 1]);

        await expect(db.addSpendingKeys(keys)).resolves.not.toThrow();

        [dbKey] = await db.getSpendingKeys(keys[numKeys - 1].accountPublicKey);
        expect(dbKey).toEqual(keys[numKeys - 1]);
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
      const generateUserProfile = async (user: AccountData) => {
        await db.addAccount(user);

        const note = randomNote(undefined, { ownerPubKey: user.accountPublicKey });
        await db.addNote(note);

        const spendingKey = randomSpendingKey({ accountPublicKey: user.accountPublicKey });
        await db.addSpendingKey(spendingKey);

        const paymentTx = randomPaymentTx({ accountPublicKey: user.accountPublicKey });
        await db.addPaymentTx(paymentTx);

        const accountTx = randomAccountTx({ accountPublicKey: user.accountPublicKey });
        await db.addAccountTx(accountTx);

        return { user, note, spendingKey, paymentTx, accountTx };
      };

      it('remove all data of a user', async () => {
        const user0 = randomUser();
        const user1 = randomUser();
        const profile0 = await generateUserProfile(user0);
        const profile1 = await generateUserProfile(user1);

        await db.removeAccount(user0.accountPublicKey);

        expect(await db.getAccount(user0.accountPublicKey)).toBeUndefined();
        expect(await db.getNotes(user0.accountPublicKey)).toEqual([]);
        expect(await db.getNote(profile0.note.commitment)).toBeUndefined();
        expect(await db.getSpendingKeys(user0.accountPublicKey)).toEqual([]);
        expect(await db.getPaymentTxs(user0.accountPublicKey)).toEqual([]);
        expect(await db.getAccountTxs(user0.accountPublicKey)).toEqual([]);

        expect(await db.getAccount(user1.accountPublicKey)).toEqual(profile1.user);
        expect(await db.getNotes(user1.accountPublicKey)).toEqual([profile1.note]);
        expect(await db.getNote(profile1.note.commitment)).toEqual(profile1.note);
        expect(await db.getSpendingKeys(user1.accountPublicKey)).toEqual([profile1.spendingKey]);
        expect(await db.getPaymentTxs(user1.accountPublicKey)).toEqual([profile1.paymentTx]);
        expect(await db.getAccountTxs(user1.accountPublicKey)).toEqual([profile1.accountTx]);
      });

      it('can clear all tables', async () => {
        const alias = randomAlias();
        await db.addAlias(alias);

        const note = randomNote();
        await db.addNote(note);

        const user = randomUser();
        await db.addAccount(user);

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
        expect(await db.getAccount(user.accountPublicKey)).toBeUndefined();
        expect(await db.getKey(keyName)).toBeUndefined();
        expect(await db.getSpendingKey(spendingKey.accountPublicKey, fullKey)).toBeUndefined();
        expect(await db.getPaymentTx(tx.accountPublicKey, tx.txId)).toBeUndefined();
      });
    });

    describe('genesis data', () => {
      it('stores genesis data', async () => {
        const data = randomBytes(50000);
        await expect(db.setGenesisData(data)).resolves.not.toThrow();
        const saved = await db.getGenesisData();
        expect(saved.equals(data)).toBe(true);
      });

      it('stores large genesis data', async () => {
        const data = randomBytes(21000000);
        await expect(db.setGenesisData(data)).resolves.not.toThrow();
        const saved = await db.getGenesisData();
        expect(saved.equals(data)).toBe(true);
      });

      it('returns empty buffer if no genesis data present', async () => {
        const saved = await db.getGenesisData();
        expect(saved).not.toBeUndefined();
        expect(saved.equals(Buffer.alloc(0))).toBe(true);
        const data = randomBytes(50000);
        await expect(db.setGenesisData(data)).resolves.not.toThrow();
        const newSaved = await db.getGenesisData();
        expect(newSaved.equals(data)).toBe(true);
      });
    });
  });
};
