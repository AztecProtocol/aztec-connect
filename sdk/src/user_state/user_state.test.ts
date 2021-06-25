import { AccountAliasId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId, computeAccountAliasIdNullifier } from '@aztec/barretenberg/client_proofs';
import { Blake2s, Pedersen } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import {
  batchDecryptNotes,
  ClaimNoteTxData,
  DefiInteractionNote,
  NoteAlgorithms,
  TreeClaimNote,
  TreeNote,
} from '@aztec/barretenberg/note_algorithms';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { toBufferBE } from 'bigint-buffer';
import { randomBytes } from 'crypto';
import { Database } from '../database';
import { AccountId, UserData } from '../user';
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

  const createEphemeralPrivKey = () => grumpkin.getRandomFr();

  const createUser = () => {
    const privateKey = randomBytes(32);
    const publicKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
    return {
      id: new AccountId(publicKey, 0),
      privateKey,
      publicKey,
      nonce: 0,
      syncedToRollup: -1,
    };
  };

  beforeAll(async () => {
    const barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);
  });

  beforeEach(async () => {
    user = createUser();

    db = {
      getJoinSplitTx: jest.fn(),
      settleJoinSplitTx: jest.fn(),
      addJoinSplitTx: jest.fn(),
      getAccountTx: jest.fn(),
      settleAccountTx: jest.fn(),
      addAccountTx: jest.fn(),
      getDefiTx: jest.fn(),
      settleDefiTx: jest.fn(),
      claimDefiTx: jest.fn(),
      addDefiTx: jest.fn(),
      getNote: jest.fn(),
      addNote: jest.fn(),
      nullifyNote: jest.fn(),
      getNoteByNullifier: jest.fn(),
      addClaim: jest.fn(),
      getClaim: jest.fn(),
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

  const createNote = (assetId: number, value: bigint, user: AccountId, version = 1) => {
    const ephPrivKey = createEphemeralPrivKey();
    const note = TreeNote.createFromEphPriv(user.publicKey, value, assetId, user.nonce, ephPrivKey, grumpkin, version);
    const viewingKey = note.getViewingKey(ephPrivKey, grumpkin);
    return { note, viewingKey };
  };

  const createGibberishNote = () => ({
    note: TreeNote.createFromEphPriv(GrumpkinAddress.randomAddress(), 0n, 0, 0, randomBytes(32), grumpkin),
    viewingKey: ViewingKey.random(),
  });

  const createClaimNote = (bridgeId: BridgeId, value: bigint, user: AccountId) => {
    const ephPrivKey = createEphemeralPrivKey();
    const txData = ClaimNoteTxData.createFromEphPriv(value, bridgeId, user, ephPrivKey, grumpkin);
    const partialState = noteAlgos.computePartialState(txData, user);
    return {
      note: new TreeClaimNote(value, bridgeId, 0, partialState),
      viewingKey: txData.getViewingKey(user.publicKey, ephPrivKey, grumpkin),
    };
  };

  const createGibberishClaimNote = () => ({
    note: new TreeClaimNote(0n, BridgeId.random(), 0, randomBytes(64)),
    viewingKey: ViewingKey.random(),
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
    const notes = [
      validNewNote
        ? createNote(assetId, outputNoteValue1, new AccountId(user.publicKey, newNoteNonce), 0)
        : createGibberishNote(),
      validChangeNote
        ? createNote(assetId, outputNoteValue2, new AccountId(user.publicKey, newNoteNonce))
        : createGibberishNote(),
    ];
    const encryptedNote1 = createValidNoteEncryptions ? noteAlgos.encryptNote(notes[0].note) : randomBytes(64);
    const encryptedNote2 = createValidNoteEncryptions ? noteAlgos.encryptNote(notes[1].note) : randomBytes(64);
    const nullifier1 = isPadding
      ? Buffer.alloc(32)
      : noteAlgos.computeNoteNullifier(randomBytes(64), 0, user.privateKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(randomBytes(64), 1, user.privateKey);
    const viewingKeys = notes.map(n => n.viewingKey);
    const proofData = new InnerProofData(
      ProofId.JOIN_SPLIT,
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
      ProofId.ACCOUNT,
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

  const generateDefiDepositProof = ({
    validNewNote = true,
    validClaimNote = true,
    bridgeId = BridgeId.random(),
    outputNoteValue = 0n,
    depositValue = 0n,
    proofSender = user,
    claimNoteRecipient = user.id,
  } = {}) => {
    const assetId = bridgeId.inputAssetId;
    const claimNote = validClaimNote
      ? createClaimNote(bridgeId, depositValue, claimNoteRecipient)
      : createGibberishClaimNote();
    const newNote = validNewNote ? createNote(assetId, outputNoteValue, proofSender.id) : createGibberishNote();
    const encryptedNotes = [noteAlgos.encryptClaimNote(claimNote.note), noteAlgos.encryptNote(newNote.note)];
    const nullifier1 = noteAlgos.computeNoteNullifier(randomBytes(64), 0, proofSender.privateKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(randomBytes(64), 1, proofSender.privateKey);
    const viewingKeys = [claimNote.viewingKey, newNote.viewingKey];
    const proofData = new InnerProofData(
      ProofId.DEFI_DEPOSIT,
      toBufferBE(0n, 32),
      toBufferBE(depositValue, 32),
      bridgeId.toBuffer(),
      encryptedNotes[0],
      encryptedNotes[1],
      nullifier1,
      nullifier2,
      EthAddress.ZERO.toBuffer32(),
      EthAddress.ZERO.toBuffer32(),
    );
    return { proofData, viewingKeys };
  };

  const generateDefiClaimProof = ({
    bridgeId = BridgeId.random(),
    validNewNote1 = true,
    validNewNote2 = true,
    outputValueA = 0n,
    outputValueB = 0n,
    nullifier = randomBytes(32),
  } = {}) => {
    const assetId = bridgeId.inputAssetId;
    const notes = [
      validNewNote1 ? createNote(assetId, outputValueA, user.id, 0) : createGibberishNote(),
      validNewNote2 ? createNote(assetId, outputValueB, user.id) : createGibberishNote(),
    ];
    const encryptedNotes = [noteAlgos.encryptNote(notes[0].note), noteAlgos.encryptNote(notes[1].note)];
    const proofData = new InnerProofData(
      ProofId.DEFI_CLAIM,
      toBufferBE(0n, 32),
      toBufferBE(0n, 32),
      bridgeId.toBuffer(),
      encryptedNotes[0],
      encryptedNotes[1],
      nullifier,
      Buffer.alloc(32),
      EthAddress.ZERO.toBuffer32(),
      EthAddress.ZERO.toBuffer32(),
    );
    return { proofData };
  };

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
      randomBytes(32),
      randomBytes(32),
      Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK).fill(BridgeId.ZERO.toBuffer()),
      Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK).fill(Buffer.alloc(32)),
      totalTxFees,
      innerProofData,
      randomBytes(32 * 16),
      Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK).fill(Buffer.alloc(64)),
      randomBytes(32),
      viewingKeys,
    );
  };

  const generateJoinSplitRollup = (rollupId = 0, options: any = {}) => {
    const { proofData, viewingKeys } = generateJoinSplitProof(options);
    return generateRollup(rollupId, [proofData], [viewingKeys]);
  };

  const generateAccountRollup = (options: any = {}) => generateRollup(0, [generateAccountProof(options)], []);

  const generateDefiDepositRollup = (rollupId = 0, options: any = {}) => {
    const { proofData, viewingKeys } = generateDefiDepositProof(options);
    return generateRollup(rollupId, [proofData], [viewingKeys]);
  };

  const generateDefiClaimRollup = (rollupId = 0, options: any = {}) => {
    const { proofData } = generateDefiClaimProof(options);
    return generateRollup(rollupId, [proofData]);
  };

  const createBlock = (
    rollupProofData: RollupProofData,
    created = new Date(),
    interactionResult: DefiInteractionNote[] = [],
  ): Block => ({
    txHash: TxHash.random(),
    rollupId: rollupProofData.rollupId,
    rollupSize: 1,
    rollupProofData: rollupProofData.toBuffer(),
    viewingKeysData: rollupProofData.getViewingKeyData(),
    interactionResult,
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

  it('restore a join split tx sent to another user', async () => {
    const outputNoteValue1 = 56n;
    const outputNoteValue2 = 78n;
    const rollupProofData = generateJoinSplitRollup(0, { validNewNote: false, outputNoteValue1, outputNoteValue2 });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: innerProofData.newNote2, value: outputNoteValue2 });
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(1);
    expect(db.addJoinSplitTx.mock.calls[0][0]).toMatchObject({
      userId: user.id,
      recipientPrivateOutput: 0n,
      senderPrivateOutput: 78n,
      ownedByUser: true,
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

  it('settle a defi tx, add claim to db and nullify old notes', async () => {
    const inputNoteIndex = 123;
    const outputNoteValue = 36n;
    const bridgeId = BridgeId.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const outputValueA = depositValue / 5n;
    const outputValueB = totalOutputValueB / 5n;

    const rollupProofData = generateDefiDepositRollup(0, { bridgeId, outputNoteValue, depositValue });
    const blockCreated = new Date();
    const interactionResult = [
      new DefiInteractionNote(bridgeId, 0, totalInputValue, totalOutputValueA, totalOutputValueB, true),
      new DefiInteractionNote(BridgeId.random(), 1, 12n, 34n, 56n, true),
    ];
    const block = createBlock(rollupProofData, blockCreated, interactionResult);

    const innerProofData = rollupProofData.innerProofData[0];
    const txHash = new TxHash(innerProofData.txId);
    const viewingKey = rollupProofData.viewingKeys[0][0];
    const [decrypted] = await batchDecryptNotes(viewingKey.toBuffer(), user.privateKey, noteAlgos, grumpkin);
    const claimNoteNullifer = noteAlgos.computeClaimNoteNullifier(innerProofData.newNote1, 0);

    db.getDefiTx.mockResolvedValue({ txHash, settled: undefined });
    db.getNoteByNullifier.mockResolvedValueOnce({
      index: inputNoteIndex,
      owner: user.id,
      nullifier: claimNoteNullifer,
      value: 100n,
    });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addClaim).toHaveBeenCalledTimes(1);
    expect(db.addClaim.mock.calls[0][0]).toMatchObject({
      txHash,
      secret: decrypted!.noteSecret,
      owner: user.id,
    });
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: innerProofData.newNote2, value: outputNoteValue });
    expect(db.nullifyNote).toHaveBeenCalledTimes(1);
    expect(db.nullifyNote).toHaveBeenCalledWith(inputNoteIndex);
    expect(db.settleDefiTx).toHaveBeenCalledTimes(1);
    expect(db.settleDefiTx).toHaveBeenCalledWith(txHash, outputValueA, outputValueB, blockCreated);
    expect(db.addDefiTx).toHaveBeenCalledTimes(0);
  });

  it('restore a defi tx and save to db, nullify input notes', async () => {
    const inputNoteIndexes = [123, 124];
    const inputNoteValues = [70n, 30n];
    const outputNoteValue = 36n;
    const bridgeId = BridgeId.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const outputValueA = depositValue / 5n;
    const outputValueB = totalOutputValueB / 5n;

    const rollupProofData = generateDefiDepositRollup(0, { bridgeId, outputNoteValue, depositValue });
    const blockCreated = new Date();
    const interactionResult = [
      new DefiInteractionNote(BridgeId.random(), 0, 12n, 34n, 56n, true),
      new DefiInteractionNote(bridgeId, 1, totalInputValue, totalOutputValueA, totalOutputValueB, true),
    ];
    const block = createBlock(rollupProofData, blockCreated, interactionResult);

    db.getNoteByNullifier.mockResolvedValueOnce({
      index: inputNoteIndexes[0],
      owner: user.id,
      value: inputNoteValues[0],
    });
    db.getNoteByNullifier.mockResolvedValueOnce({
      index: inputNoteIndexes[1],
      owner: user.id,
      value: inputNoteValues[1],
    });

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    const txHash = new TxHash(innerProofData.txId);
    expect(db.addClaim.mock.calls[0][0]).toMatchObject({
      txHash,
      owner: user.id,
    });
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: innerProofData.newNote2, value: outputNoteValue });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(inputNoteIndexes[0]);
    expect(db.nullifyNote).toHaveBeenCalledWith(inputNoteIndexes[1]);
    expect(db.settleDefiTx).toHaveBeenCalledTimes(0);
    expect(db.addDefiTx).toHaveBeenCalledTimes(1);
    expect(db.addDefiTx).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash,
        userId: user.id,
        bridgeId,
        privateInput: 100n,
        privateOutput: outputNoteValue,
        depositValue,
        outputValueA,
        outputValueB,
        settled: blockCreated,
      }),
    );
  });

  it('mark a defi tx as claimed and add new notes', async () => {
    const bridgeId = BridgeId.random();
    const depositValue = 12n;
    const outputValueA = 34n;
    const outputValueB = 56n;
    const txHash = TxHash.random();
    const secret = randomBytes(32);
    const nullifier = randomBytes(32);

    db.getClaim.mockImplementation(() => ({ txHash, owner: user.id, secret }));
    db.getDefiTx.mockImplementation(() => ({ bridgeId, depositValue, outputValueA, outputValueB }));

    const rollupProofData = generateDefiClaimRollup(0, { bridgeId, outputValueA, outputValueB, nullifier });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: innerProofData.newNote1,
      value: outputValueA,
      secret,
    });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({
      dataEntry: innerProofData.newNote2,
      value: outputValueB,
      secret,
    });
    expect(db.claimDefiTx).toHaveBeenCalledTimes(1);
    expect(db.claimDefiTx).toHaveBeenCalledWith(txHash, blockCreated);
  });

  it('mark a defi tx as claimed and add refund note', async () => {
    const bridgeId = BridgeId.random();
    const depositValue = 12n;
    const outputValueA = 0n;
    const outputValueB = 0n;
    const txHash = TxHash.random();
    const secret = randomBytes(32);
    const nullifier = randomBytes(32);

    db.getClaim.mockImplementation(() => ({ txHash, owner: user.id, secret }));
    db.getDefiTx.mockImplementation(() => ({ bridgeId, depositValue, outputValueA, outputValueB }));

    const rollupProofData = generateDefiClaimRollup(0, { bridgeId, outputValueA, outputValueB, nullifier });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    userState.processBlock(block);
    await userState.stopSync(true);

    const innerProofData = rollupProofData.innerProofData[0];
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: innerProofData.newNote1,
      value: depositValue,
      secret,
    });
    expect(db.claimDefiTx).toHaveBeenCalledTimes(1);
    expect(db.claimDefiTx).toHaveBeenCalledWith(txHash, blockCreated);
  });

  it('ignore a defi claim proof for account with a different nonce', async () => {
    const bridgeId = BridgeId.random();
    const depositValue = 12n;
    const outputValueA = 34n;
    const outputValueB = 56n;
    const txHash = TxHash.random();
    const secret = randomBytes(32);
    const nullifier = randomBytes(32);

    db.getClaim.mockImplementation(() => ({
      txHash,
      owner: new AccountId(user.id.publicKey, user.id.nonce + 1),
      secret,
    }));
    db.getDefiTx.mockImplementation(() => ({ bridgeId, depositValue, outputValueA, outputValueB }));

    const rollupProofData = generateDefiClaimRollup(0, { bridgeId, outputValueA, outputValueB, nullifier });
    const blockCreated = new Date();
    const block = createBlock(rollupProofData, blockCreated);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.claimDefiTx).toHaveBeenCalledTimes(0);
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
