import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { computeAccountAliasIdNullifier } from 'barretenberg/client_proofs/account_proof/compute_nullifier';
import { createEphemeralPrivKey, deriveNoteSecret, encryptNote, TreeNote } from 'barretenberg/client_proofs/tree_note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { InnerProofData, RollupProofData } from 'barretenberg/rollup_proof';
import { numToUInt32BE } from 'barretenberg/serialize';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { TxHash } from 'barretenberg/tx_hash';
import { toBufferBE } from 'bigint-buffer';
import { randomBytes } from 'crypto';
import { Database } from '../database';
import { UserData, AccountId, AccountAliasId } from '../user';
import { UserState } from './index';
import { Block } from 'barretenberg/block_source';
import { ViewingKey } from 'barretenberg/viewing_key';

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
      getUserNotes: jest.fn().mockResolvedValue([]),
      getUser: jest.fn().mockResolvedValue(user),
      updateUser: jest.fn(),
      addUserSigningKey: jest.fn(),
      getUserSigningKeys: jest.fn().mockResolvedValue([]),
    } as any;

    const blockSource = {
      getBlocks: jest.fn().mockResolvedValue([]),
    };

    userState = new UserState(user, grumpkin, pedersen, noteAlgos, db as any, blockSource as any);
    await userState.init();
    await userState.startSync();
  });

  const generateJoinSplitProof = ({
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
    isPadding = false,
    createValidNoteEncryptions = true,
  } = {}) => {
    const ephPrivKey = createEphemeralPrivKey(grumpkin);
    const note1 = TreeNote.createFromEphPriv(
      user.publicKey,
      BigInt(outputNoteValue1),
      assetId,
      newNoteNonce,
      ephPrivKey,
      grumpkin,
    );
    // Set the first output note secret to use the old secret derivation method.
    // We want to validate that we can correctl decruyt notes that use the old 2050-bit secret keys
    note1.noteSecret = deriveNoteSecret(user.publicKey, ephPrivKey, grumpkin, 0);

    const note2 = TreeNote.createFromEphPriv(
      user.publicKey,
      BigInt(outputNoteValue2),
      assetId,
      newNoteNonce,
      ephPrivKey,
      grumpkin,
    );
    const gibberishNote = TreeNote.createFromEphPriv(GrumpkinAddress.randomAddress(), 0n, 0, 0, ephPrivKey, grumpkin);
    const encryptedNote1 = createValidNoteEncryptions ? noteAlgos.encryptNote(note1.toBuffer()) : randomBytes(64);
    const encryptedNote2 = createValidNoteEncryptions ? noteAlgos.encryptNote(note2.toBuffer()) : randomBytes(64);
    const nullifier1 = isPadding
      ? Buffer.alloc(32)
      : noteAlgos.computeNoteNullifier(randomBytes(64), 0, user.privateKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(randomBytes(64), 1, user.privateKey);
    const viewingKeys = [
      encryptNote(validNewNote ? note1 : gibberishNote, ephPrivKey, grumpkin),
      encryptNote(validChangeNote ? note2 : gibberishNote, ephPrivKey, grumpkin),
    ];
    const proofData = new InnerProofData(
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
    return { proofData, viewingKeys };
  };

  const generateAccountProof = ({
    accountCreator = user,
    alias = 'god',
    newSigningPubKey1 = GrumpkinAddress.randomAddress(),
    newSigningPubKey2 = GrumpkinAddress.randomAddress(),
    migrate = false,
  } = {}) => {
    const { publicKey, nonce } = accountCreator;
    const aliasHash = AliasHash.fromAlias(alias, blake2s);
    const note1 = Buffer.concat([publicKey.x(), newSigningPubKey1.x()]);
    const note2 = Buffer.concat([publicKey.x(), newSigningPubKey2.x()]);
    const newAccountAliasId = new AccountAliasId(aliasHash!, nonce + +migrate);
    const nullifier1 = migrate ? computeAccountAliasIdNullifier(newAccountAliasId, pedersen) : randomBytes(32);
    const nullifier2 = randomBytes(32);
    return new InnerProofData(
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
  };

  const generateAccountRollup = (options: any = {}) => generateRollup(0, [generateAccountProof(options)], []);

  const generateRollup = (rollupId = 0, innerProofData: InnerProofData[] = [], viewingKeys: ViewingKey[][] = []) => {
    const totalTxFees = new Array(RollupProofData.NUMBER_OF_ASSETS).fill(0).map(() => randomBytes(32));
    return new RollupProofData(
      rollupId,
      innerProofData.length,
      0,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      totalTxFees,
      1,
      innerProofData,
      randomBytes(32 * 16),
      viewingKeys,
    );
  };

  const generateJoinSplitRollup = (rollupId = 0, options: any = {}) => {
    const { proofData, viewingKeys } = generateJoinSplitProof(options);
    return generateRollup(rollupId, [proofData], [viewingKeys]);
  };

  const createBlock = (rollupProofData: RollupProofData, created = new Date()): Block => ({
    txHash: TxHash.random(),
    rollupId: rollupProofData.rollupId,
    rollupSize: 1,
    rollupProofData: rollupProofData.toBuffer(),
    viewingKeysData: rollupProofData.getViewingKeyData(),
    created,
    gasUsed: 0,
    gasPrice: 0n,
  });

  it('settle existing join split tx, add new note to db and nullify old note', async () => {
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;
    const inputNoteIndex = 123;

    const rollupProofData = generateJoinSplitRollup(0, { outputNoteValue1, outputNoteValue2 });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    db.getJoinSplitTx.mockResolvedValue({ txHash: '', settled: undefined });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: inputNoteIndex, owner: user.id });

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: innerProofData.newNote1, value: outputNoteValue1 });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({ dataEntry: innerProofData.newNote2, value: outputNoteValue2 });
    expect(db.nullifyNote).toHaveBeenCalledTimes(1);
    expect(db.nullifyNote).toHaveBeenCalledWith(inputNoteIndex);
    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(1);
    expect(db.settleJoinSplitTx).toHaveBeenCalledWith(new TxHash(innerProofData.txId), blockCreated);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.updateUser).toHaveBeenLastCalledWith({
      ...user,
      syncedToRollup: block.rollupId,
    });
  });

  it('should correctly process multiple blocks', async () => {
    const jsProof1 = generateJoinSplitProof({ outputNoteValue1: 1n, outputNoteValue2: 2n });
    const padding = generateJoinSplitProof({ isPadding: true });
    const rollupProofData1 = generateRollup(0, [jsProof1.proofData, padding.proofData], [jsProof1.viewingKeys]);
    const blockCreated = new Date();
    const block1 = createBlock(rollupProofData1, blockCreated);

    const accountProof = generateAccountProof({
      accountCreator: { ...user, publicKey: GrumpkinAddress.randomAddress() },
    });
    const jsProof2 = generateJoinSplitProof({
      outputNoteValue1: 3n,
      outputNoteValue2: 4n,
    });
    const rollupProofData2 = generateRollup(1, [accountProof, jsProof2.proofData], [jsProof2.viewingKeys]);
    const block2 = createBlock(rollupProofData2, blockCreated);

    db.getJoinSplitTx.mockResolvedValue({ txHash: '', settled: undefined });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 0, owner: user.id });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 1, owner: user.id });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 2, owner: user.id });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 3, owner: user.id });

    await userState.handleBlocks([block1, block2]);

    const innerProofData1 = rollupProofData1.innerProofData[0];
    const innerProofData2 = rollupProofData2.innerProofData[1];
    expect(db.addNote).toHaveBeenCalledTimes(4);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: innerProofData1.newNote1, value: 1n });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({ dataEntry: innerProofData1.newNote2, value: 2n });
    expect(db.addNote.mock.calls[2][0]).toMatchObject({ dataEntry: innerProofData2.newNote1, value: 3n });
    expect(db.addNote.mock.calls[3][0]).toMatchObject({ dataEntry: innerProofData2.newNote2, value: 4n });
    expect(db.nullifyNote).toHaveBeenCalledTimes(4);
    expect(db.nullifyNote).toHaveBeenCalledWith(0);
    expect(db.nullifyNote).toHaveBeenCalledWith(1);
    expect(db.nullifyNote).toHaveBeenCalledWith(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(3);
    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(2);
    expect(db.settleJoinSplitTx).toHaveBeenCalledWith(new TxHash(innerProofData1.txId), blockCreated);
    expect(db.settleJoinSplitTx).toHaveBeenCalledWith(new TxHash(innerProofData2.txId), blockCreated);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.updateUser).toHaveBeenCalledTimes(1);
    expect(db.updateUser).toHaveBeenLastCalledWith({
      ...user,
      syncedToRollup: block2.rollupId,
    });
  });

  it('should correctly update syncedToRollup', async () => {
    const initialUser = userState.getUser();
    expect(initialUser.syncedToRollup).toBe(-1);

    const blocks = Array(5)
      .fill(0)
      .map((_, i) => createBlock(generateJoinSplitRollup(i)));
    await userState.handleBlocks(blocks);

    const user = userState.getUser();
    expect(user.syncedToRollup).toBe(4);
    expect(user).not.toBe(initialUser);

    const paddingBlocks = Array(3)
      .fill(0)
      .map((_, i) =>
        createBlock(
          generateJoinSplitRollup(blocks.length + i, {
            isPadding: true,
          }),
        ),
      );
    await userState.handleBlocks(paddingBlocks);

    expect(userState.getUser().syncedToRollup).toBe(7);
  });

  it('do nothing if it cannot decrypt new notes', async () => {
    const rollupProofData = generateJoinSplitRollup(0, { validChangeNote: false, validNewNote: false });
    const block = createBlock(rollupProofData);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
  });

  it('do nothing if the join split tx has been settled', async () => {
    const rollupProofData = generateRollup();
    const block = createBlock(rollupProofData);

    db.getJoinSplitTx.mockResolvedValue({ settled: new Date() });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
  });

  it('should not add new note to db if it has different nonce', async () => {
    const rollupProofData = generateJoinSplitRollup(0, {
      outputNoteValue1: 10n,
      outputNoteValue2: 20n,
      newNoteNonce: user.nonce + 1,
    });
    const block = createBlock(rollupProofData);

    db.getJoinSplitTx.mockResolvedValue({ settled: undefined });

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

    const rollupProofData = generateJoinSplitRollup(0, {
      assetId,
      outputNoteValue1,
      outputNoteValue2,
      publicInput,
      publicOutput,
      inputOwner,
      outputOwner,
    });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    db.getNoteByNullifier.mockResolvedValueOnce({ index: 123, owner: user.id, value: inputNoteValue });

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
      settled: blockCreated,
    });
  });

  it('restore a join split tx sent from another user to us', async () => {
    const outputNoteValue1 = 56n;
    const rollupProofData = generateJoinSplitRollup(0, { validChangeNote: false, outputNoteValue1 });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

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
      settled: blockCreated,
    });
  });

  it('restore a join split tx sent from another local user to us', async () => {
    const outputNoteValue1 = 56n;
    const rollupProofData = generateJoinSplitRollup(0, { validChangeNote: false, outputNoteValue1 });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    const owner = AccountId.random();
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 1, owner });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 2, owner });

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
      settled: blockCreated,
    });
  });

  it('should settle account tx and add signing keys for user', async () => {
    const newSigningPubKey1 = GrumpkinAddress.randomAddress();
    const newSigningPubKey2 = GrumpkinAddress.randomAddress();
    const rollupProofData = generateAccountRollup({ newSigningPubKey1, newSigningPubKey2 });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    db.getAccountTx.mockResolvedValue({
      settled: undefined,
    });

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    const txHash = new TxHash(innerProofData.txId);
    const accountId = new AccountId(user.publicKey, user.nonce);

    expect(db.addUserSigningKey).toHaveBeenCalledTimes(2);
    expect(db.addUserSigningKey.mock.calls[0][0]).toEqual({
      accountId,
      key: newSigningPubKey1.x(),
      treeIndex: 0,
    });
    expect(db.addUserSigningKey.mock.calls[1][0]).toEqual({
      accountId,
      key: newSigningPubKey2.x(),
      treeIndex: 1,
    });
    expect(db.settleAccountTx).toHaveBeenCalledTimes(1);
    expect(db.settleAccountTx).toHaveBeenCalledWith(txHash, blockCreated);
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

  it('restore account tx, update user alias hash and save to db', async () => {
    const newSigningPubKey1 = GrumpkinAddress.randomAddress();
    const newSigningPubKey2 = GrumpkinAddress.randomAddress();
    const alias = 'fairy';
    const rollupProofData = generateAccountRollup({ alias, newSigningPubKey1, newSigningPubKey2 });
    const aliasHash = AliasHash.fromAlias(alias, blake2s);

    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    expect(userState.getUser().aliasHash).toBe(undefined);

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    const txHash = new TxHash(innerProofData.txId);
    const accountId = new AccountId(user.publicKey, user.nonce);

    expect(userState.getUser().aliasHash).toEqual(aliasHash);
    expect(db.updateUser).toHaveBeenLastCalledWith({
      ...user,
      aliasHash,
      syncedToRollup: block.rollupId,
    });
    expect(db.addUserSigningKey).toHaveBeenCalledWith({
      accountId,
      key: newSigningPubKey1.x(),
      treeIndex: 0,
    });
    expect(db.addUserSigningKey).toHaveBeenCalledWith({
      accountId,
      key: newSigningPubKey2.x(),
      treeIndex: 1,
    });
    expect(db.settleAccountTx).toHaveBeenCalledTimes(0);
    expect(db.addAccountTx).toHaveBeenCalledTimes(1);
    expect(db.addAccountTx.mock.calls[0][0]).toMatchObject({
      txHash,
      userId: user.id,
      aliasHash,
      newSigningPubKey1: newSigningPubKey1.x(),
      newSigningPubKey2: newSigningPubKey2.x(),
      migrated: false,
      settled: blockCreated,
    });
  });

  it('should not add notes with incorrect commitments', async () => {
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;
    const inputNoteIndex = 123;

    const rollupProofData = generateJoinSplitRollup(0, {
      outputNoteValue1,
      outputNoteValue2,
      createValidNoteEncryptions: false,
    });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    db.getJoinSplitTx.mockResolvedValue({ txHash: '', settled: undefined });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: inputNoteIndex, owner: user.id });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
  });
});
