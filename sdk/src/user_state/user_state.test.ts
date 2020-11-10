import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import {
  computeAliasNullifier,
  computeRemoveSigningKeyNullifier,
} from 'barretenberg/client_proofs/join_split_proof/compute_nullifier';
import { createNoteSecret, encryptNote, Note } from 'barretenberg/client_proofs/note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { InnerProofData, RollupProofData } from 'barretenberg/rollup_proof';
import { numToUInt32BE } from 'barretenberg/serialize';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { randomBytes } from 'crypto';
import { Database, SigningKey } from '../database';
import { UserData } from '../user';
import { UserState } from './index';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('user state', () => {
  let grumpkin: Grumpkin;
  let blake2s: Blake2s;
  let pedersen: Pedersen;
  let noteAlgos: NoteAlgorithms;
  let db: Mockify<Database>;
  let userState: UserState;
  let user: UserData;

  beforeAll(async () => {
    const barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);
  });

  beforeEach(async () => {
    const privateKey = randomBytes(32);
    user = {
      id: randomBytes(64),
      privateKey,
      publicKey: new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey)),
      syncedToRollup: -1,
    };

    db = {
      getUserTx: jest.fn(),
      settleUserTx: jest.fn(),
      addUserTx: jest.fn(),
      getNote: jest.fn(),
      addNote: jest.fn(),
      nullifyNote: jest.fn(),
      getNoteByNullifier: jest.fn(),
      getUserNotes: jest.fn(),
      updateUser: jest.fn(),
      addUserSigningKey: jest.fn(),
      removeUserSigningKey: jest.fn(),
      getUserSigningKeys: jest.fn().mockResolvedValue([]),
    } as any;

    const blockSource = {
      getBlocks: jest.fn().mockResolvedValue([]),
    };

    userState = new UserState(user, grumpkin, noteAlgos, pedersen, db as any, blockSource as any);
    await userState.startSync();
  });

  const generateRollup = (validNewNote = true, validChangeNote = true, publicInput = 0, publicOutput = 0) => {
    const secret = createNoteSecret();
    const note1 = new Note(user.publicKey, secret, BigInt(100), 0);
    const note2 = new Note(user.publicKey, secret, BigInt(0), 0);
    const gibberishNote = new Note(GrumpkinAddress.randomAddress(), secret, 0n, 0);
    const encryptedNote1 = randomBytes(64);
    const encryptedNote2 = randomBytes(64);
    const nullifier1 = noteAlgos.computeNoteNullifier(randomBytes(64), 0, user.privateKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(randomBytes(64), 1, user.privateKey);
    const viewingKeys = [
      encryptNote(validNewNote ? note1 : gibberishNote, grumpkin),
      encryptNote(validChangeNote ? note2 : gibberishNote, grumpkin),
    ];
    const innerProofData = new InnerProofData(
      0,
      numToUInt32BE(publicInput, 32),
      numToUInt32BE(publicOutput, 32),
      0,
      encryptedNote1,
      encryptedNote2,
      nullifier1,
      nullifier2,
      EthAddress.ZERO,
      EthAddress.ZERO,
      viewingKeys,
    );
    return new RollupProofData(
      0,
      1,
      0,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      1,
      [innerProofData],
      randomBytes(32 * 16),
    );
  };

  const generateAccountRollup = (
    publicKey: GrumpkinAddress,
    newKey1: GrumpkinAddress,
    newKey2: GrumpkinAddress,
    nullify?: Buffer,
  ) => {
    const note1 = Buffer.concat([publicKey.x(), newKey1.x()]);
    const note2 = Buffer.concat([publicKey.x(), newKey2.x()]);
    const nullifier1 = computeAliasNullifier('god', pedersen, blake2s);
    const nullifier2 = computeRemoveSigningKeyNullifier(publicKey, nullify || randomBytes(32), pedersen);
    const viewingKeys = [Buffer.alloc(0), Buffer.alloc(0)];
    const innerProofData = new InnerProofData(
      1,
      publicKey.x(),
      publicKey.y(),
      0,
      note1,
      note2,
      nullifier1,
      nullifier2,
      EthAddress.ZERO,
      EthAddress.ZERO,
      viewingKeys,
    );
    return new RollupProofData(
      0,
      1,
      0,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      1,
      [innerProofData],
      randomBytes(32 * 16),
    );
  };

  const createBlock = (rollupProofData: RollupProofData) => ({
    txHash: randomBytes(32),
    blockNum: 0,
    rollupId: 0,
    rollupSize: 1,
    rollupProofData: rollupProofData.toBuffer(),
    viewingKeysData: rollupProofData.getViewingKeyData(),
    created: new Date(),
  });

  it('settle existing user tx, add new note to db and nullify old note', async () => {
    const rollupProofData = generateRollup();
    const block = createBlock(rollupProofData);

    db.getUserTx.mockResolvedValue({ settled: false });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 123 });
    db.getUserNotes.mockResolvedValue([]);

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    expect(db.settleUserTx).toHaveBeenCalledTimes(1);
    expect(db.settleUserTx).toHaveBeenCalledWith(user.id, innerProofData.getTxId());
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: innerProofData.newNote1, value: 100n });
    expect(db.nullifyNote).toHaveBeenCalledTimes(1);
    expect(db.nullifyNote).toHaveBeenCalledWith(123);
  });

  it('do nothing if it cannot decrypt new notes', async () => {
    const rollupProofData = generateRollup(false, false);
    const block = createBlock(rollupProofData);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.settleUserTx).toHaveBeenCalledTimes(0);
    expect(db.addUserTx).toHaveBeenCalledTimes(0);
  });

  it('do nothing if the userTx has been settled', async () => {
    const rollupProofData = generateRollup();
    const block = createBlock(rollupProofData);

    db.getUserTx.mockResolvedValue({ settled: true });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.settleUserTx).toHaveBeenCalledTimes(0);
    expect(db.addUserTx).toHaveBeenCalledTimes(0);
  });

  it('should restore a RECEIVE tx', async () => {
    const rollupProofData = generateRollup(true, false);
    const block = createBlock(rollupProofData);

    db.getUserNotes.mockResolvedValue([]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserTx).toHaveBeenCalledTimes(1);
    expect(db.addUserTx.mock.calls[0][0]).toMatchObject({ action: 'RECEIVE', value: 100n });
  });

  it('should restore a TRANSFER tx', async () => {
    const rollupProofData = generateRollup(true, true);
    const block = createBlock(rollupProofData);

    db.getUserNotes.mockResolvedValue([]);
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 123, value: 100n });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserTx).toHaveBeenCalledTimes(1);
    expect(db.addUserTx.mock.calls[0][0]).toMatchObject({ action: 'TRANSFER', value: 100n });
  });

  it('should restore a PUBLIC_TRANSFER tx', async () => {
    const rollupProofData = generateRollup(false, true, 60, 60);
    const block = createBlock(rollupProofData);

    db.getUserNotes.mockResolvedValue([]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserTx).toHaveBeenCalledTimes(1);
    expect(db.addUserTx.mock.calls[0][0]).toMatchObject({ action: 'PUBLIC_TRANSFER', value: 60n });
  });

  it('should restore a DEPOSIT tx', async () => {
    const rollupProofData = generateRollup(true, true, 100, 0);
    const block = createBlock(rollupProofData);

    db.getUserNotes.mockResolvedValue([]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserTx).toHaveBeenCalledTimes(1);
    expect(db.addUserTx.mock.calls[0][0]).toMatchObject({ action: 'DEPOSIT', value: 100n });
  });

  it('should restore a WITHDRAW tx', async () => {
    const rollupProofData = generateRollup(false, true, 0, 40);
    const block = createBlock(rollupProofData);

    db.getUserNotes.mockResolvedValue([]);
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 123, value: 100n });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserTx).toHaveBeenCalledTimes(1);
    expect(db.addUserTx.mock.calls[0][0]).toMatchObject({ action: 'WITHDRAW', value: 40n });
  });

  it('should ignore account proof that is not us', async () => {
    const key1 = GrumpkinAddress.randomAddress();
    const key2 = GrumpkinAddress.randomAddress();
    const rollupProofData = generateAccountRollup(GrumpkinAddress.randomAddress(), key1, key2);
    const block = createBlock(rollupProofData);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserSigningKey).not.toHaveBeenCalled();
    expect(db.removeUserSigningKey).not.toHaveBeenCalled();
  });

  it('should add signing keys for user', async () => {
    const key1 = GrumpkinAddress.randomAddress();
    const key2 = GrumpkinAddress.randomAddress();
    const rollupProofData = generateAccountRollup(user.publicKey, key1, key2);
    const block = createBlock(rollupProofData);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserSigningKey).toHaveBeenCalledWith({ owner: user.id, key: key1.x(), treeIndex: 0 });
    expect(db.addUserSigningKey).toHaveBeenCalledWith({ owner: user.id, key: key2.x(), treeIndex: 1 });
    expect(db.removeUserSigningKey).not.toHaveBeenCalled();
  });

  it('should remove signing key for user', async () => {
    const key1 = GrumpkinAddress.ZERO;
    const key2 = GrumpkinAddress.ZERO;
    const toNullify = GrumpkinAddress.randomAddress();
    const existingKey: SigningKey = { owner: user.id, key: toNullify.x(), treeIndex: 0 };

    db.getUserSigningKeys.mockResolvedValue([existingKey]);

    const rollupProofData = generateAccountRollup(user.publicKey, key1, key2, toNullify.x());
    const block = createBlock(rollupProofData);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserSigningKey).not.toHaveBeenCalled();
    expect(db.addUserSigningKey).not.toHaveBeenCalled();
    expect(db.removeUserSigningKey).toHaveBeenCalledWith(existingKey);
  });
});
