import { AccountAliasId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { Block, BlockSource } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Blake2s } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import {
  batchDecryptNotes,
  ClaimNoteTxData,
  DefiInteractionNote,
  NoteAlgorithms,
  TreeClaimNote,
  TreeNote,
} from '@aztec/barretenberg/note_algorithms';
import {
  OffchainAccountData,
  OffchainDefiClaimData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
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
  let noteAlgos: NoteAlgorithms;
  let blockSource: BlockSource;
  let db: Mockify<Database>;
  let userState: UserState;
  let user: UserData;

  const createEphemeralPrivKey = () => grumpkin.getRandomFr();

  const createUser = () => {
    const privateKey = randomBytes(32);
    const publicKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
    const nonce = 0;
    return {
      id: new AccountId(publicKey, nonce),
      privateKey,
      publicKey,
      nonce,
      syncedToRollup: -1,
    };
  };

  beforeAll(async () => {
    const barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
    blake2s = new Blake2s(barretenberg);
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
      updateDefiTx: jest.fn(),
      settleDefiTx: jest.fn(),
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

    blockSource = {
      getBlocks: jest.fn().mockResolvedValue([]),
    } as any;

    userState = new UserState(user, grumpkin, noteAlgos, db as any, blockSource as any);
    await userState.init();
    await userState.startSync();
  });

  const createNote = (assetId: number, value: bigint, user: AccountId, version = 1) => {
    const ephPrivKey = createEphemeralPrivKey();
    const note = TreeNote.createFromEphPriv(user.publicKey, value, assetId, user.nonce, ephPrivKey, grumpkin, version);
    const viewingKey = note.getViewingKey(ephPrivKey, grumpkin);
    return { note, viewingKey };
  };

  const createClaimNote = (bridgeId: BridgeId, value: bigint, user: AccountId, noteSecret: Buffer) => {
    const txData = new ClaimNoteTxData(value, bridgeId, noteSecret);
    const partialState = noteAlgos.valueNotePartialCommitment(txData.noteSecret, user);
    return new TreeClaimNote(value, bridgeId, 0, BigInt(0), partialState);
  };

  const generateJoinSplitProof = ({
    proofSender = user,
    newNoteOwner = user,
    assetId = 1,
    publicInput = 0n,
    publicOutput = 0n,
    outputNoteValue1 = 0n,
    outputNoteValue2 = 0n,
    inputOwner = EthAddress.ZERO,
    outputOwner = EthAddress.ZERO,
    noteCommitmentNonce = user.nonce,
    isPadding = false,
    createValidNoteCommitments = true,
  } = {}) => {
    const notes = [
      createNote(assetId, outputNoteValue1, new AccountId(newNoteOwner.publicKey, noteCommitmentNonce), 0),
      createNote(assetId, outputNoteValue2, new AccountId(proofSender.publicKey, noteCommitmentNonce)),
    ];
    const note1Commitment = createValidNoteCommitments ? noteAlgos.valueNoteCommitment(notes[0].note) : randomBytes(32);
    const note2Commitment = createValidNoteCommitments ? noteAlgos.valueNoteCommitment(notes[1].note) : randomBytes(32);
    const nullifier1 = isPadding
      ? Buffer.alloc(32)
      : noteAlgos.valueNoteNullifier(randomBytes(32), 0, proofSender.privateKey);
    const nullifier2 = noteAlgos.valueNoteNullifier(randomBytes(32), 1, proofSender.privateKey);
    const viewingKeys = isPadding ? [] : notes.map(n => n.viewingKey);
    const proofData = new InnerProofData(
      ProofId.JOIN_SPLIT,
      toBufferBE(publicInput, 32),
      toBufferBE(publicOutput, 32),
      numToUInt32BE(assetId, 32),
      note1Commitment,
      note2Commitment,
      nullifier1,
      nullifier2,
      inputOwner.toBuffer32(),
      outputOwner.toBuffer32(),
    );
    const offchainTxData = new OffchainJoinSplitData(viewingKeys);
    return { proofData, offchainTxData };
  };

  const generateAccountProof = ({
    accountCreator = user.id,
    alias = 'god',
    newSigningPubKey1 = GrumpkinAddress.randomAddress(),
    newSigningPubKey2 = GrumpkinAddress.randomAddress(),
    migrate = false,
  } = {}) => {
    const { publicKey, nonce } = accountCreator;
    const aliasHash = AliasHash.fromAlias(alias, blake2s);
    const note1 = randomBytes(32);
    const note2 = randomBytes(32);
    const accountAliasId = new AccountAliasId(aliasHash!, nonce);
    const newAccountAliasId = new AccountAliasId(aliasHash!, nonce + +migrate);
    const nullifier1 = migrate ? noteAlgos.accountAliasIdNullifier(accountAliasId) : randomBytes(32);
    const nullifier2 = randomBytes(32);
    const proofData = new InnerProofData(
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
    const offchainTxData = new OffchainAccountData(
      publicKey,
      newAccountAliasId,
      newSigningPubKey1.x(),
      newSigningPubKey2.x(),
    );
    return {
      proofData,
      offchainTxData,
    };
  };

  const generateDefiDepositProof = ({
    bridgeId = BridgeId.random(),
    outputNoteValue = 0n,
    depositValue = 0n,
    proofSender = user,
    claimNoteRecipient = user.id,
  } = {}) => {
    const assetId = bridgeId.inputAssetId;
    const newNote = createNote(assetId, outputNoteValue, proofSender.id);
    const claimNote = createClaimNote(bridgeId, depositValue, claimNoteRecipient, newNote.note.noteSecret);
    const noteCommitments = [
      noteAlgos.claimNotePartialCommitment(claimNote),
      noteAlgos.valueNoteCommitment(newNote.note),
    ];
    const nullifier1 = noteAlgos.valueNoteNullifier(randomBytes(32), 0, proofSender.privateKey);
    const nullifier2 = noteAlgos.valueNoteNullifier(randomBytes(32), 1, proofSender.privateKey);
    const viewingKeys = [newNote.viewingKey];
    const proofData = new InnerProofData(
      ProofId.DEFI_DEPOSIT,
      toBufferBE(0n, 32),
      toBufferBE(depositValue, 32),
      bridgeId.toBuffer(),
      noteCommitments[0],
      noteCommitments[1],
      nullifier1,
      nullifier2,
      EthAddress.ZERO.toBuffer32(),
      EthAddress.ZERO.toBuffer32(),
    );
    const partialState = randomBytes(32);
    const offchainTxData = new OffchainDefiDepositData(bridgeId, partialState, depositValue, 0n, viewingKeys[0]);
    return { proofData, offchainTxData };
  };

  const generateDefiClaimProof = ({
    noteRecipient = user,
    bridgeId = BridgeId.random(),
    outputValueA = 0n,
    outputValueB = 0n,
    nullifier = randomBytes(32),
  } = {}) => {
    const assetId = bridgeId.inputAssetId;
    const notes = [
      createNote(assetId, outputValueA, noteRecipient.id, 0),
      createNote(assetId, outputValueB, noteRecipient.id),
    ];
    const noteCommitments = [
      noteAlgos.valueNoteCommitment(notes[0].note),
      noteAlgos.valueNoteCommitment(notes[1].note),
    ];
    const proofData = new InnerProofData(
      ProofId.DEFI_CLAIM,
      toBufferBE(0n, 32),
      toBufferBE(0n, 32),
      bridgeId.toBuffer(),
      noteCommitments[0],
      noteCommitments[1],
      nullifier,
      Buffer.alloc(32),
      EthAddress.ZERO.toBuffer32(),
      EthAddress.ZERO.toBuffer32(),
    );
    const offchainTxData = new OffchainDefiClaimData();
    return { proofData, offchainTxData };
  };

  const generateRollup = (rollupId = 0, innerProofs: InnerProofData[] = [], rollupSize = innerProofs.length) => {
    const totalTxFees = new Array(RollupProofData.NUMBER_OF_ASSETS).fill(0).map(() => randomBytes(32));
    const innerProofData = [...innerProofs];
    for (let i = innerProofs.length; i < rollupSize; ++i) {
      innerProofData.push(InnerProofData.PADDING);
    }
    return new RollupProofData(
      rollupId,
      rollupSize,
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
      Array(RollupProofData.NUMBER_OF_ASSETS).fill(Buffer.alloc(32, 1 << 30)),
      totalTxFees,
      Array(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK).fill(Buffer.alloc(32)),
      randomBytes(32),
      1,
      innerProofData,
    );
  };

  const createBlock = (
    rollupProofData: RollupProofData,
    offchainTxData: Buffer[],
    interactionResult: DefiInteractionNote[] = [],
  ): Block => ({
    txHash: TxHash.random(),
    rollupId: rollupProofData.rollupId,
    rollupSize: 1,
    rollupProofData: rollupProofData.toBuffer(),
    offchainTxData,
    interactionResult,
    created: new Date(),
    gasUsed: 0,
    gasPrice: 0n,
  });

  const createRollupBlock = (
    innerProofs: { proofData: InnerProofData; offchainTxData: { toBuffer(): Buffer } }[] = [],
    { rollupId = 0, rollupSize = innerProofs.length, interactionResult = [] as DefiInteractionNote[] } = {},
  ) => {
    const rollup = generateRollup(
      rollupId,
      innerProofs.map(p => p.proofData),
      rollupSize,
    );
    const offchainTxData = innerProofs.map(p => p.offchainTxData.toBuffer());
    return createBlock(rollup, offchainTxData, interactionResult);
  };

  it('settle existing join split tx, add new note to db and nullify old note', async () => {
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;
    const inputNoteIndex = 123;

    const jsProof = generateJoinSplitProof({ outputNoteValue1, outputNoteValue2 });
    const block = createRollupBlock([jsProof]);

    db.getJoinSplitTx.mockResolvedValue({ txHash: '', settled: undefined });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: inputNoteIndex, owner: user.id });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: jsProof.proofData.noteCommitment1,
      value: outputNoteValue1,
    });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({
      dataEntry: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(1);
    expect(db.nullifyNote).toHaveBeenCalledWith(inputNoteIndex);
    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(1);
    expect(db.settleJoinSplitTx).toHaveBeenCalledWith(new TxHash(jsProof.proofData.txId), user.id, block.created);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.updateUser).toHaveBeenLastCalledWith({
      ...user,
      syncedToRollup: block.rollupId,
    });
  });

  it('should correctly process multiple blocks', async () => {
    const jsProof1 = generateJoinSplitProof({ outputNoteValue1: 1n, outputNoteValue2: 2n });
    const block1 = createRollupBlock([jsProof1], { rollupId: 0, rollupSize: 2 });

    const accountProof = generateAccountProof({
      migrate: true,
    });
    const jsProof2 = generateJoinSplitProof({
      outputNoteValue1: 3n,
      outputNoteValue2: 4n,
    });
    const block2 = createRollupBlock([accountProof, jsProof2], { rollupId: 1, rollupSize: 2 });

    db.getJoinSplitTx.mockResolvedValue({ txHash: '', settled: undefined });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 0, owner: user.id });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 1, owner: user.id });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 2, owner: user.id });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 3, owner: user.id });

    await userState.handleBlocks([block1, block2]);

    expect(db.addNote).toHaveBeenCalledTimes(4);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ dataEntry: jsProof1.proofData.noteCommitment1, value: 1n });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({ dataEntry: jsProof1.proofData.noteCommitment2, value: 2n });
    expect(db.addNote.mock.calls[2][0]).toMatchObject({ dataEntry: jsProof2.proofData.noteCommitment1, value: 3n });
    expect(db.addNote.mock.calls[3][0]).toMatchObject({ dataEntry: jsProof2.proofData.noteCommitment2, value: 4n });
    expect(db.nullifyNote).toHaveBeenCalledTimes(4);
    expect(db.nullifyNote).toHaveBeenCalledWith(0);
    expect(db.nullifyNote).toHaveBeenCalledWith(1);
    expect(db.nullifyNote).toHaveBeenCalledWith(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(3);
    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(2);
    expect(db.settleJoinSplitTx).toHaveBeenCalledWith(new TxHash(jsProof1.proofData.txId), user.id, block1.created);
    expect(db.settleJoinSplitTx).toHaveBeenCalledWith(new TxHash(jsProof2.proofData.txId), user.id, block2.created);
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
      .map((_, i) => createRollupBlock([generateJoinSplitProof()], { rollupId: i }));
    await userState.handleBlocks(blocks);

    const user = userState.getUser();
    expect(user.syncedToRollup).toBe(4);
    expect(user).not.toBe(initialUser);

    const paddingBlocks = Array(3)
      .fill(0)
      .map((_, i) => createRollupBlock([], { rollupId: 5 + i, rollupSize: 1 }));
    await userState.handleBlocks(paddingBlocks);

    expect(userState.getUser().syncedToRollup).toBe(7);
  });

  it('do nothing if it cannot decrypt new notes', async () => {
    const stranger = createUser();
    const block = createRollupBlock([generateJoinSplitProof({ proofSender: stranger, newNoteOwner: stranger })]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.settleJoinSplitTx).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(0);
  });

  it('do nothing if new notes owner has a different nonce', async () => {
    const newUserId = new AccountId(user.publicKey, 1);
    const block = createRollupBlock([
      generateJoinSplitProof({
        outputNoteValue1: 10n,
        outputNoteValue2: 20n,
        noteCommitmentNonce: user.nonce + 1,
        proofSender: { ...user, id: newUserId, nonce: newUserId.nonce },
        newNoteOwner: { ...user, id: newUserId, nonce: newUserId.nonce },
      }),
    ]);

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

    const jsProof = generateJoinSplitProof({
      assetId,
      outputNoteValue1,
      outputNoteValue2,
      publicInput,
      publicOutput,
      inputOwner,
      outputOwner,
    });
    const block = createRollupBlock([jsProof]);

    db.getNoteByNullifier.mockResolvedValueOnce({ index: 123, owner: user.id, value: inputNoteValue });

    userState.processBlock(block);
    await userState.stopSync(true);

    const txHash = new TxHash(jsProof.proofData.txId);
    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: jsProof.proofData.noteCommitment1,
      value: outputNoteValue1,
    });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({
      dataEntry: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
    });
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
      settled: block.created,
    });
  });

  it('restore a join split tx sent from another user to us', async () => {
    const proofSender = createUser();
    const outputNoteValue1 = 56n;
    const outputNoteValue2 = 78n;
    const jsProof = generateJoinSplitProof({
      proofSender,
      outputNoteValue1,
      outputNoteValue2,
    });
    const block = createRollupBlock([jsProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: jsProof.proofData.noteCommitment1,
      value: outputNoteValue1,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(1);
    expect(db.addJoinSplitTx.mock.calls[0][0]).toMatchObject({
      userId: user.id,
      privateInput: 0n,
      recipientPrivateOutput: outputNoteValue1,
      senderPrivateOutput: 0n,
      ownedByUser: false,
      settled: block.created,
    });
  });

  it('restore a join split tx sent from another local user to us', async () => {
    const proofSender = createUser();
    const outputNoteValue1 = 56n;
    const outputNoteValue2 = 78n;
    const jsProof = generateJoinSplitProof({ proofSender, outputNoteValue1, outputNoteValue2 });
    const block = createRollupBlock([jsProof]);

    db.getNoteByNullifier.mockResolvedValueOnce({ index: 1, owner: proofSender.id, value: 12n });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: 2, owner: proofSender.id, value: 34n });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: jsProof.proofData.noteCommitment1,
      value: outputNoteValue1,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(1);
    expect(db.addJoinSplitTx.mock.calls[0][0]).toMatchObject({
      userId: user.id,
      privateInput: 0n,
      recipientPrivateOutput: outputNoteValue1,
      senderPrivateOutput: 0n,
      ownedByUser: false,
      settled: block.created,
    });
  });

  it('restore a join split tx sent to another user', async () => {
    const outputNoteValue1 = 56n;
    const outputNoteValue2 = 78n;
    const jsProof = generateJoinSplitProof({
      newNoteOwner: createUser(),
      outputNoteValue1,
      outputNoteValue2,
    });
    const block = createRollupBlock([jsProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
    });
    expect(db.addJoinSplitTx).toHaveBeenCalledTimes(1);
    expect(db.addJoinSplitTx.mock.calls[0][0]).toMatchObject({
      userId: user.id,
      recipientPrivateOutput: 0n,
      senderPrivateOutput: 78n,
      ownedByUser: true,
      settled: block.created,
    });
  });

  it('should settle account tx and add signing keys for user', async () => {
    const newSigningPubKey1 = GrumpkinAddress.randomAddress();
    const newSigningPubKey2 = GrumpkinAddress.randomAddress();
    const accountProof = generateAccountProof({ newSigningPubKey1, newSigningPubKey2 });
    const block = createRollupBlock([accountProof]);

    db.getAccountTx.mockResolvedValue({
      settled: undefined,
    });

    userState.processBlock(block);
    await userState.stopSync(true);

    const txHash = new TxHash(accountProof.proofData.txId);
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
    expect(db.settleAccountTx).toHaveBeenCalledWith(txHash, block.created);
    expect(db.addAccountTx).toHaveBeenCalledTimes(0);
  });

  it('should ignore account proof that is not us', async () => {
    const randomUser = createUser();
    const accountProof = generateAccountProof({ accountCreator: randomUser.id });
    const block = createRollupBlock([accountProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addUserSigningKey).toHaveBeenCalledTimes(0);
    expect(db.settleAccountTx).toHaveBeenCalledTimes(0);
    expect(db.addAccountTx).toHaveBeenCalledTimes(0);
  });

  it('restore a migrated account tx, update user alias hash and save to db', async () => {
    const newSigningPubKey1 = GrumpkinAddress.randomAddress();
    const newSigningPubKey2 = GrumpkinAddress.randomAddress();
    const alias = 'fairy';
    const accountProof = generateAccountProof({ alias, newSigningPubKey1, newSigningPubKey2, migrate: true });
    const aliasHash = AliasHash.fromAlias(alias, blake2s);

    const block = createRollupBlock([accountProof]);

    {
      userState.processBlock(block);
      await userState.stopSync(true);

      expect(userState.getUser().aliasHash).toBe(undefined);
      expect(db.updateUser).toHaveBeenLastCalledWith({
        ...user,
        syncedToRollup: block.rollupId,
      });
      expect(db.addUserSigningKey).toHaveBeenCalledTimes(0);
      expect(db.settleAccountTx).toHaveBeenCalledTimes(0);
      expect(db.addAccountTx).toHaveBeenCalledTimes(0);
    }

    {
      const newUser = { ...user, nonce: 1, id: new AccountId(user.publicKey, 1) };
      const newUserState = new UserState(newUser, grumpkin, noteAlgos, db as any, blockSource as any);

      db.getUser.mockResolvedValueOnce(newUser);
      await newUserState.init();
      await newUserState.startSync();

      expect(newUserState.getUser().aliasHash).toBe(undefined);

      newUserState.processBlock(block);
      await newUserState.stopSync(true);

      const txHash = new TxHash(accountProof.proofData.txId);

      expect(newUserState.getUser().aliasHash).toEqual(aliasHash);
      expect(db.updateUser).toHaveBeenLastCalledWith({
        ...newUser,
        aliasHash,
        syncedToRollup: block.rollupId,
      });
      expect(db.addUserSigningKey).toHaveBeenCalledWith({
        accountId: newUser.id,
        key: newSigningPubKey1.x(),
        treeIndex: 0,
      });
      expect(db.addUserSigningKey).toHaveBeenCalledWith({
        accountId: newUser.id,
        key: newSigningPubKey2.x(),
        treeIndex: 1,
      });
      expect(db.settleAccountTx).toHaveBeenCalledTimes(0);
      expect(db.addAccountTx).toHaveBeenCalledTimes(1);
      expect(db.addAccountTx.mock.calls[0][0]).toMatchObject({
        txHash,
        userId: newUser.id,
        aliasHash,
        newSigningPubKey1: newSigningPubKey1.x(),
        newSigningPubKey2: newSigningPubKey2.x(),
        migrated: true,
        settled: block.created,
      });
    }
  });

  it('update a defi tx, add claim to db and nullify old notes', async () => {
    const inputNoteIndex = 123;
    const outputNoteValue = 36n;
    const bridgeId = BridgeId.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const outputValueA = depositValue / 5n;
    const outputValueB = totalOutputValueB / 5n;

    const defiProof = generateDefiDepositProof({ bridgeId, outputNoteValue, depositValue });
    const interactionResult = [
      new DefiInteractionNote(bridgeId, 0, totalInputValue, totalOutputValueA, totalOutputValueB, true),
      new DefiInteractionNote(BridgeId.random(), 1, 12n, 34n, 56n, true),
    ];
    const block = createRollupBlock([defiProof], { interactionResult });

    const txHash = new TxHash(defiProof.proofData.txId);
    const viewingKey = defiProof.offchainTxData.viewingKey;
    const [decrypted] = await batchDecryptNotes(viewingKey.toBuffer(), user.privateKey, noteAlgos, grumpkin);
    const claimNoteNullifer = noteAlgos.claimNoteNullifier(defiProof.proofData.noteCommitment1, 0);

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
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: defiProof.proofData.noteCommitment2,
      value: outputNoteValue,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(1);
    expect(db.nullifyNote).toHaveBeenCalledWith(inputNoteIndex);
    expect(db.updateDefiTx).toHaveBeenCalledTimes(1);
    expect(db.updateDefiTx).toHaveBeenCalledWith(txHash, outputValueA, outputValueB);
    expect(db.addDefiTx).toHaveBeenCalledTimes(0);
    expect(db.settleDefiTx).toHaveBeenCalledTimes(0);
  });

  it('restore a defi tx and save to db, nullify input notes', async () => {
    const inputNoteIndexes = [123, 124];
    const inputNoteValues = [70n, 30n];
    const outputNoteValue = 20n;
    const bridgeId = BridgeId.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const outputValueA = depositValue / 5n;
    const outputValueB = totalOutputValueB / 5n;

    const defiProof = generateDefiDepositProof({ bridgeId, outputNoteValue, depositValue });
    const interactionResult = [
      new DefiInteractionNote(BridgeId.random(), 0, 12n, 34n, 56n, true),
      new DefiInteractionNote(bridgeId, 1, totalInputValue, totalOutputValueA, totalOutputValueB, true),
    ];
    const block = createRollupBlock([defiProof], { interactionResult });

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

    const txHash = new TxHash(defiProof.proofData.txId);
    expect(db.addClaim.mock.calls[0][0]).toMatchObject({
      txHash,
      owner: user.id,
    });
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: defiProof.proofData.noteCommitment2,
      value: outputNoteValue,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(inputNoteIndexes[0]);
    expect(db.nullifyNote).toHaveBeenCalledWith(inputNoteIndexes[1]);
    expect(db.updateDefiTx).toHaveBeenCalledTimes(0);
    expect(db.addDefiTx).toHaveBeenCalledTimes(1);
    expect(db.addDefiTx).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash,
        userId: user.id,
        bridgeId,
        depositValue,
        txFee: inputNoteValues[0] + inputNoteValues[1] - outputNoteValue - depositValue,
        outputValueA,
        outputValueB,
        settled: undefined,
      }),
    );
    expect(db.settleDefiTx).toHaveBeenCalledTimes(0);
  });

  it('settle a defi tx and add new notes', async () => {
    const bridgeId = BridgeId.random();
    const depositValue = 12n;
    const outputValueA = 34n;
    const outputValueB = 56n;
    const txHash = TxHash.random();
    const secret = randomBytes(32);
    const nullifier = randomBytes(32);

    db.getClaim.mockImplementation(() => ({ txHash, owner: user.id, secret }));
    db.getDefiTx.mockImplementation(() => ({ bridgeId, depositValue, outputValueA, outputValueB }));

    const claimProof = generateDefiClaimProof({ bridgeId, outputValueA, outputValueB, nullifier });
    const block = createRollupBlock([claimProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: claimProof.proofData.noteCommitment1,
      value: outputValueA,
      secret,
    });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({
      dataEntry: claimProof.proofData.noteCommitment2,
      value: outputValueB,
      secret,
    });
    expect(db.settleDefiTx).toHaveBeenCalledTimes(1);
    expect(db.settleDefiTx).toHaveBeenCalledWith(txHash, block.created);
  });

  it('settle a defi tx and add refund note', async () => {
    const bridgeId = BridgeId.random();
    const depositValue = 12n;
    const outputValueA = 0n;
    const outputValueB = 0n;
    const txHash = TxHash.random();
    const secret = randomBytes(32);
    const nullifier = randomBytes(32);

    db.getClaim.mockImplementation(() => ({ txHash, owner: user.id, secret }));
    db.getDefiTx.mockImplementation(() => ({ bridgeId, depositValue, outputValueA, outputValueB }));

    const claimProof = generateDefiClaimProof({ bridgeId, outputValueA, outputValueB, nullifier });
    const block = createRollupBlock([claimProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      dataEntry: claimProof.proofData.noteCommitment1,
      value: depositValue,
      secret,
    });
    expect(db.settleDefiTx).toHaveBeenCalledTimes(1);
    expect(db.settleDefiTx).toHaveBeenCalledWith(txHash, block.created);
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

    const claimProof = generateDefiClaimProof({ bridgeId, outputValueA, outputValueB, nullifier });
    const block = createRollupBlock([claimProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.settleDefiTx).toHaveBeenCalledTimes(0);
  });

  it('should not add notes with incorrect commitments', async () => {
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;
    const inputNoteIndex = 123;

    const jsProof = generateJoinSplitProof({
      outputNoteValue1,
      outputNoteValue2,
      createValidNoteCommitments: false,
    });
    const block = createRollupBlock([jsProof]);

    db.getJoinSplitTx.mockResolvedValue({ txHash: '', settled: undefined });
    db.getNoteByNullifier.mockResolvedValueOnce({ index: inputNoteIndex, owner: user.id });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
  });
});
