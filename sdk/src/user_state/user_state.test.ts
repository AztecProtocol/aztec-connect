import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { randomBytes } from 'crypto';
import { Note, createNoteSecret, encryptNote } from 'barretenberg/client_proofs/note';
import { computeNullifier } from 'barretenberg/client_proofs/join_split_proof/compute_nullifier';
import { InnerProofData, RollupProofData } from 'barretenberg/rollup_proof';
import { numToUInt32BE } from 'barretenberg/serialize';
import { Database } from '../database';
import { UserData } from '../user';
import { UserState } from './index';
import { GrumpkinAddress, EthAddress } from 'barretenberg/address';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('User State', () => {
  let grumpkin: Grumpkin;
  let blake2s: Blake2s;
  let db: Mockify<Database>;
  let userState: UserState;
  let user: UserData;

  beforeAll(async () => {
    const barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
    blake2s = new Blake2s(barretenberg);
    const privateKey = randomBytes(32);
    user = {
      ethAddress: EthAddress.randomAddress(),
      privateKey,
      publicKey: new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey)),
      syncedToBlock: -1,
      syncedToRollup: -1,
    };
  });

  beforeEach(async () => {
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
    } as any;

    const blockSource = {
      getBlocks: jest.fn().mockResolvedValue([]),
    };

    userState = new UserState(user, grumpkin, blake2s, db as any, blockSource as any);
    await userState.startSync();
  });

  const generateRollup = (validNewNote = true, validChangeNote = true, publicInput = 0, publicOutput = 0) => {
    const secret = createNoteSecret();
    const note1 = new Note(user.publicKey, secret, BigInt(100));
    const note2 = new Note(user.publicKey, secret, BigInt(0));
    const gibberishNote = new Note(GrumpkinAddress.randomAddress(), secret, 0n);
    const encryptedNote1 = randomBytes(64);
    const encryptedNote2 = randomBytes(64);
    const nullifier1 = computeNullifier(randomBytes(64), 0, secret, blake2s);
    const nullifier2 = computeNullifier(randomBytes(64), 1, secret, blake2s);
    const viewingKeys = [
      encryptNote(validNewNote ? note1 : gibberishNote, grumpkin),
      encryptNote(validChangeNote ? note2 : gibberishNote, grumpkin),
    ];
    const innerProofData = new InnerProofData(
      numToUInt32BE(publicInput, 32),
      numToUInt32BE(publicOutput, 32),
      encryptedNote1,
      encryptedNote2,
      nullifier1,
      nullifier2,
      Buffer.alloc(20),
      Buffer.alloc(20),
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
    );
  };

  const createBlock = (rollupProofData: RollupProofData) => ({
    txHash: randomBytes(32),
    blockNum: 0,
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
    expect(db.settleUserTx).toHaveBeenCalledWith(innerProofData.getTxId());
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
});
