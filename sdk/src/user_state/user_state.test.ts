import { Blake2s } from 'barretenberg/crypto/blake2s';
import * as client_proofs_note from 'barretenberg/client_proofs/note';
import * as compute_nullifier from 'barretenberg/client_proofs/join_split_proof/compute_nullifier';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { randomBytes } from 'crypto';
import 'fake-indexeddb/auto'; // needs to be imported before Dexie
import Dexie from 'dexie';
import { DexieDatabase } from '../database';
import { UserState } from './index';
import { UserTx } from '../user_tx';

const { Note } = client_proofs_note;

describe('User State', () => {
  let grumpkin: Grumpkin;
  let blake2s: Blake2s;
  let db: DexieDatabase;
  let userState: UserState;
  let decryptNoteSpy: jest.SpyInstance;
  let computeNullifierSpy: jest.SpyInstance;

  const user = {
    id: 123,
    address: randomBytes(20),
    privateKey: randomBytes(32),
    publicKey: randomBytes(64),
  };

  beforeAll(async () => {
    const barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
    blake2s = new Blake2s(barretenberg);
  });

  beforeEach(async () => {
    db = new DexieDatabase();

    await db.addUser(user);

    userState = new UserState(user, grumpkin, blake2s, db);

    decryptNoteSpy = jest.spyOn(client_proofs_note, 'decryptNote');
    computeNullifierSpy = jest.spyOn(compute_nullifier, 'computeNullifier');
  });

  afterEach(() => {
    decryptNoteSpy.mockReset();
    computeNullifierSpy.mockReset();
    db.close();
    Dexie.delete('hummus');
  });

  it('process block and sync the notes to indexedDB', async () => {
    const block = {
      txHash: randomBytes(16),
      blockNum: 0,
      rollupId: 0,
      dataStartIndex: 0,
      numDataEntries: 2,
      dataEntries: [randomBytes(64)],
      nullifiers: [],
      viewingKeys: [randomBytes(20)],
    };
    const nullifier = randomBytes(16);
    const noteSecret = randomBytes(10);

    decryptNoteSpy.mockImplementationOnce(() => new Note(user.publicKey, noteSecret, 100));
    computeNullifierSpy.mockImplementationOnce(() => nullifier);

    let note = await db.getNoteByNullifier(user.id, nullifier);
    expect(note).toBe(undefined);

    expect(decryptNoteSpy).toHaveBeenCalledTimes(0);

    const updated = await userState.processBlock(block);

    expect(decryptNoteSpy).toHaveBeenCalledTimes(1);

    note = await db.getNoteByNullifier(user.id, nullifier);
    expect(note).toEqual({
      index: 0,
      owner: user.id,
      value: 100,
      dataEntry: block.dataEntries[0],
      encrypted: block.viewingKeys[0],
      viewingKey: noteSecret,
      nullifier,
      nullified: false,
    });

    expect(updated).toBe(true);
  });

  it('add and get user', async () => {
    const txHash = Buffer.from('test-id-1');
    const userTx: UserTx = {
      txHash,
      userId: user.id,
      action: 'DEPOSIT',
      value: 100,
      recipient: user.publicKey,
      settled: false,
      created: new Date(),
    };

    await userState.addUserTx(userTx);

    const userTxResult = await userState.getUserTx(txHash);
    expect(userTxResult).toEqual(userTx);
  });

  it('add user idempotence', async () => {
    const userTx1: UserTx = {
      txHash: Buffer.from('test-id-1'),
      userId: user.id,
      action: 'DEPOSIT',
      value: 100,
      recipient: user.publicKey,
      settled: false,
      created: new Date(),
    };

    await userState.addUserTx(userTx1);

    let userTxs = await userState.getUserTxs();
    expect(userTxs).toEqual([userTx1]);

    await userState.addUserTx(userTx1);

    userTxs = await userState.getUserTxs();
    expect(userTxs).toEqual([userTx1]);

    const userTx2 = { ...userTx1, txHash: Buffer.from('test-id-2') };

    await userState.addUserTx(userTx2);

    userTxs = await userState.getUserTxs();
    expect(userTxs).toEqual([userTx2, userTx1]);
  });
});
