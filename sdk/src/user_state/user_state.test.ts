import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { computeAccountAliasIdNullifier } from 'barretenberg/client_proofs/account_proof/compute_nullifier';
import { createEphemeralPrivKey, encryptNote, Note } from 'barretenberg/client_proofs/note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { InnerProofData, RollupProofData } from 'barretenberg/rollup_proof';
import { numToUInt32BE } from 'barretenberg/serialize';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/rollup_provider';
import { toBufferBE } from 'bigint-buffer';
import { randomBytes } from 'crypto';
import { Database } from '../database';
import { UserData, AccountId, AccountAliasId } from '../user';
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
    const publicKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
    user = {
      id: new AccountId(publicKey, 0),
      privateKey,
      publicKey,
      nonce: 0,
      aliasHash: AliasHash.fromAlias('god', blake2s),
      syncedToRollup: -1,
    };

    db = {
      getJoinSplitTx: jest.fn(),
      settleJoinSplitTx: jest.fn(),
      addJoinSplitTx: jest.fn(),
      getAccountTx: jest.fn(),
      settleAccountTx: jest.fn(),
      addAccountTx: jest.fn(),
      getNote: jest.fn(),
      addNote: jest.fn(),
      nullifyNote: jest.fn(),
      getNoteByNullifier: jest.fn(),
      getUserNotes: jest.fn(),
      updateUser: jest.fn(),
      addUserSigningKey: jest.fn(),
      getUserSigningKeys: jest.fn().mockResolvedValue([]),
    } as any;

    const blockSource = {
      getBlocks: jest.fn().mockResolvedValue([]),
    };

    userState = new UserState(user, grumpkin, pedersen, noteAlgos, db as any, blockSource as any);
    await userState.startSync();
  });

  const generateRollup = ({
    validNewNote = true,
    validChangeNote = true,
    assetId = 1,
    publicInput = 0n,
    publicOutput = 0n,
    outputNoteValue1 = 0n,
    outputNoteValue2 = 0n,
    inputOwner = EthAddress.ZERO,
    outputOwner = EthAddress.ZERO,
    newNoteNonce = user.nonce,
  } = {}) => {
    const ephPrivKey = createEphemeralPrivKey();
    const note1 = Note.createFromEphPriv(
      user.publicKey,
      BigInt(outputNoteValue1),
      assetId,
      newNoteNonce,
      ephPrivKey,
      grumpkin,
    );
    const note2 = Note.createFromEphPriv(
      user.publicKey,
      BigInt(outputNoteValue2),
      assetId,
      newNoteNonce,
      ephPrivKey,
      grumpkin,
    );
    const gibberishNote = Note.createFromEphPriv(GrumpkinAddress.randomAddress(), 0n, 0, 0, ephPrivKey, grumpkin);
    const encryptedNote1 = randomBytes(64);
    const encryptedNote2 = randomBytes(64);
    const nullifier1 = noteAlgos.computeNoteNullifier(randomBytes(64), 0, user.privateKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(randomBytes(64), 1, user.privateKey);
    const totalTxFees = new Array(RollupProofData.NUMBER_OF_ASSETS).fill(0).map(() => randomBytes(32));
    const viewingKeys = [
      encryptNote(validNewNote ? note1 : gibberishNote, ephPrivKey, grumpkin),
      encryptNote(validChangeNote ? note2 : gibberishNote, ephPrivKey, grumpkin),
    ];
    const innerProofData = new InnerProofData(
      0,
      toBufferBE(publicInput, 32),
      toBufferBE(publicOutput, 32),
      numToUInt32BE(assetId, 32),
      encryptedNote1,
      encryptedNote2,
      nullifier1,
      nullifier2,
      inputOwner.toBuffer32(),
      outputOwner.toBuffer32(),
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
      totalTxFees,
      1,
      [innerProofData],
      randomBytes(32 * 16),
      [viewingKeys],
    );
  };

  const generateAccountRollup = ({
    accountCreator = user,
    newSigningPubKey1 = GrumpkinAddress.randomAddress(),
    newSigningPubKey2 = GrumpkinAddress.randomAddress(),
    migrate = false,
  } = {}) => {
    const { publicKey, nonce, aliasHash } = accountCreator;
    const note1 = Buffer.concat([publicKey.x(), newSigningPubKey1.x()]);
    const note2 = Buffer.concat([publicKey.x(), newSigningPubKey2.x()]);
    const newAccountAliasId = new AccountAliasId(aliasHash!, nonce + +migrate);
    const nullifier1 = migrate ? computeAccountAliasIdNullifier(newAccountAliasId, pedersen) : randomBytes(32);
    const nullifier2 = randomBytes(32);
    const totalTxFees = new Array(RollupProofData.NUMBER_OF_ASSETS).fill(0).map(() => randomBytes(32));
    const innerProofData = new InnerProofData(
      1,
      publicKey.x(),
      publicKey.y(),
      newAccountAliasId.toBuffer(),
      note1,
      note2,
      nullifier1,
      nullifier2,
      newSigningPubKey1.x(),
      newSigningPubKey2.x(),
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
      totalTxFees,
      1,
      [innerProofData],
      randomBytes(32 * 16),
      [],
    );
  };

  const createBlock = (rollupProofData: RollupProofData) => ({
    txHash: TxHash.random(),
    blockNum: 0,
    rollupId: 0,
    rollupSize: 1,
    rollupProofData: rollupProofData.toBuffer(),
    viewingKeysData: rollupProofData.getViewingKeyData(),
    created: new Date(),
  });

  it('settle existing join split tx, add new note to db and nullify old note', async () => {
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;
    const inputNoteIndex = 123;

    const rollupProofData = generateRollup({
      outputNoteValue1,
      outputNoteValue2,
    });
    const block = createBlock(rollupProofData);

    db.getJoinSplitTx.mockResolvedValue({ settled: false });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: inputNoteIndex, owner: user.id });
    db.getUserNotes.mockResolvedValue([]);

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: innerProofData.newNote1, value: outputNoteValue1 });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({ dataEntry: innerProofData.newNote2, value: outputNoteValue2 });
    expect(db.nullifyNote).toHaveBeenCalledTimes(1);
    expect(db.nullifyNote).toHaveBeenCalledWith(inputNoteIndex);
    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(1);
    expect(db.settleJoinSplitTx).toHaveBeenCalledWith(new TxHash(innerProofData.txId));
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
  });

  it('do nothing if it cannot decrypt new notes', async () => {
    const rollupProofData = generateRollup({ validChangeNote: false, validNewNote: false });
    const block = createBlock(rollupProofData);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
  });

  it('do nothing if the join split tx has been settled', async () => {
    const rollupProofData = generateRollup();
    const block = createBlock(rollupProofData);

    db.getJoinSplitTx.mockResolvedValue({ settled: true });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
  });

  it('should not add new note to db if it has different nonce', async () => {
    const rollupProofData = generateRollup({
      outputNoteValue1: 10n,
      outputNoteValue2: 20n,
      newNoteNonce: user.nonce + 1,
    });
    const block = createBlock(rollupProofData);

    db.getJoinSplitTx.mockResolvedValue({ settled: false });
    db.getUserNotes.mockResolvedValue([]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
  });

  it('restore a join split tx and save to db', async () => {
    const assetId = 1;
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;
    const inputNoteValue = 70n;
    const publicInput = 60n;
    const publicOutput = 40n;
    const inputOwner = EthAddress.randomAddress();
    const outputOwner = EthAddress.randomAddress();

    const rollupProofData = generateRollup({
      assetId,
      outputNoteValue1,
      outputNoteValue2,
      publicInput,
      publicOutput,
      inputOwner,
      outputOwner,
    });
    const block = createBlock(rollupProofData);

    db.getNoteByNullifier.mockResolvedValueOnce({ index: 123, owner: user.id, value: inputNoteValue });
    db.getUserNotes.mockResolvedValue([]);

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    const txHash = new TxHash(innerProofData.txId);
    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: innerProofData.newNote1, value: outputNoteValue1 });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({ dataEntry: innerProofData.newNote2, value: outputNoteValue2 });
    expect(db.nullifyNote).toHaveBeenCalledTimes(1);
    expect(db.nullifyNote).toHaveBeenCalledWith(123);
    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(1);
    expect(db.addJoinSplitTx.mock.calls[0][0]).toMatchObject({
      txHash,
      userId: user.id,
      assetId,
      publicInput,
      publicOutput,
      privateInput: inputNoteValue,
      recipientPrivateOutput: outputNoteValue1,
      senderPrivateOutput: outputNoteValue2,
      inputOwner,
      outputOwner,
      ownedByUser: true,
      settled: true,
    });
  });

  it('restore a join split tx sent from another user to us', async () => {
    const outputNoteValue1 = 56n;
    const rollupProofData = generateRollup({ validChangeNote: false, outputNoteValue1 });
    const block = createBlock(rollupProofData);

    db.getUserNotes.mockResolvedValue([]);

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: innerProofData.newNote1, value: outputNoteValue1 });
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(1);
    expect(db.addJoinSplitTx.mock.calls[0][0]).toMatchObject({
      userId: user.id,
      privateInput: 0n,
      recipientPrivateOutput: outputNoteValue1,
      senderPrivateOutput: 0n,
      ownedByUser: false,
      settled: true,
    });
  });

  it('should settle account tx and add signing keys for user', async () => {
    const newSigningPubKey1 = GrumpkinAddress.randomAddress();
    const newSigningPubKey2 = GrumpkinAddress.randomAddress();
    const rollupProofData = generateAccountRollup({ newSigningPubKey1, newSigningPubKey2 });
    const block = createBlock(rollupProofData);

    db.getAccountTx.mockResolvedValue({
      settled: false,
    });

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    const txHash = new TxHash(innerProofData.txId);
    const accountAliasId = new AccountAliasId(user.aliasHash!, user.nonce);

    expect(db.addUserSigningKey).toHaveBeenCalledTimes(2);
    expect(db.addUserSigningKey.mock.calls[0][0]).toEqual({
      accountAliasId,
      address: user.publicKey,
      key: newSigningPubKey1.x(),
      treeIndex: 0,
    });
    expect(db.addUserSigningKey.mock.calls[1][0]).toEqual({
      accountAliasId,
      address: user.publicKey,
      key: newSigningPubKey2.x(),
      treeIndex: 1,
    });
    expect(db.settleAccountTx).toHaveBeenCalledTimes(1);
    expect(db.settleAccountTx).toHaveBeenCalledWith(txHash);
    expect(db.addAccountTx).toHaveBeenCalledTimes(0);
  });

  it('should ignore account proof that is not us', async () => {
    const randomUser = {
      ...user,
      publicKey: GrumpkinAddress.randomAddress(),
    };
    const rollupProofData = generateAccountRollup({ accountCreator: randomUser });
    const block = createBlock(rollupProofData);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserSigningKey).toHaveBeenCalledTimes(0);
    expect(db.settleAccountTx).toHaveBeenCalledTimes(0);
    expect(db.addAccountTx).toHaveBeenCalledTimes(0);
  });

  it('should ignore account proof that has a different nonce', async () => {
    const migratedUser = {
      ...user,
      nonce: user.nonce + 1,
    };
    const rollupProofData = generateAccountRollup({ accountCreator: migratedUser });
    const block = createBlock(rollupProofData);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserSigningKey).toHaveBeenCalledTimes(0);
    expect(db.settleAccountTx).toHaveBeenCalledTimes(0);
    expect(db.addAccountTx).toHaveBeenCalledTimes(0);
  });

  it('restore account tx and save to db', async () => {
    const newSigningPubKey1 = GrumpkinAddress.randomAddress();
    const newSigningPubKey2 = GrumpkinAddress.randomAddress();
    const rollupProofData = generateAccountRollup({ newSigningPubKey1, newSigningPubKey2 });
    const block = createBlock(rollupProofData);

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    const txHash = new TxHash(innerProofData.txId);
    const accountAliasId = new AccountAliasId(user.aliasHash!, user.nonce);

    expect(db.addUserSigningKey).toHaveBeenCalledWith({
      accountAliasId,
      address: user.publicKey,
      key: newSigningPubKey1.x(),
      treeIndex: 0,
    });
    expect(db.addUserSigningKey).toHaveBeenCalledWith({
      accountAliasId,
      address: user.publicKey,
      key: newSigningPubKey2.x(),
      treeIndex: 1,
    });
    expect(db.settleAccountTx).toHaveBeenCalledTimes(0);
    expect(db.addAccountTx).toHaveBeenCalledTimes(1);
    expect(db.addAccountTx.mock.calls[0][0]).toMatchObject({
      txHash,
      userId: user.id,
      aliasHash: user.aliasHash,
      newSigningPubKey1: newSigningPubKey1.x(),
      newSigningPubKey2: newSigningPubKey2.x(),
      migrated: false,
      settled: true,
    });
  });
});
