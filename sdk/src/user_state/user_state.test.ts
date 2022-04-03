import { AccountAliasId, AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxHash } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Blake2s } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import {
  DefiInteractionNote,
  deriveNoteSecret,
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
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { randomBytes } from 'crypto';
import { CoreDefiTx, CorePaymentTx, PaymentProofId } from '../core_tx';
import { Database } from '../database';
import { UserData } from '../user';
import { UserState } from './index';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('user state', () => {
  let grumpkin: Grumpkin;
  let blake2s: Blake2s;
  let noteAlgos: NoteAlgorithms;
  let db: Mockify<Database>;
  let rollupProvider: Mockify<RollupProvider>;
  let userState: UserState;
  let user: UserData;

  const createEphemeralPrivKey = () => grumpkin.getRandomFr();

  const createEphemeralKeyPair = () => {
    const ephPrivKey = grumpkin.getRandomFr();
    const ephPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, ephPrivKey));
    return { ephPrivKey, ephPubKey };
  };

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
      getPaymentTx: jest.fn(),
      settlePaymentTx: jest.fn(),
      addPaymentTx: jest.fn(),
      getAccountTx: jest.fn(),
      settleAccountTx: jest.fn(),
      addAccountTx: jest.fn(),
      getDefiTx: jest.fn(),
      settleDefiDeposit: jest.fn(),
      updateDefiTxFinalisationResult: jest.fn(),
      settleDefiTx: jest.fn(),
      addDefiTx: jest.fn(),
      getPendingUserTxs: jest.fn().mockResolvedValue([]),
      removeUserTx: jest.fn(),
      addNote: jest.fn(),
      nullifyNote: jest.fn(),
      getNoteByNullifier: jest.fn().mockResolvedValue({ owner: user.id }),
      getUserPendingNotes: jest.fn().mockResolvedValue([]),
      removeNote: jest.fn(),
      addClaimTx: jest.fn(),
      getClaimTx: jest.fn(),
      getUserNotes: jest.fn().mockResolvedValue([]),
      getUser: jest.fn().mockResolvedValue(user),
      updateUser: jest.fn(),
      addUserSigningKey: jest.fn(),
      getUserSigningKeys: jest.fn().mockResolvedValue([]),
      getDefiTxsByNonce: jest.fn(),
    } as any;

    rollupProvider = {
      getBlocks: jest.fn().mockResolvedValue([]),
      getPendingTxs: jest.fn().mockResolvedValue([]),
    } as any;

    userState = new UserState(user, grumpkin, noteAlgos, db as any, rollupProvider as any);
    await userState.init();
    await userState.startSync();
  });

  const createNote = (assetId: number, value: bigint, user: AccountId, inputNullifier: Buffer) => {
    const ephPrivKey = createEphemeralPrivKey();
    const note = TreeNote.createFromEphPriv(
      user.publicKey,
      value,
      assetId,
      user.accountNonce,
      inputNullifier,
      ephPrivKey,
      grumpkin,
    );
    const viewingKey = note.createViewingKey(ephPrivKey, grumpkin);
    return { note, viewingKey };
  };

  const createClaimNote = (bridgeId: BridgeId, value: bigint, user: AccountId, inputNullifier: Buffer) => {
    const { ephPrivKey, ephPubKey } = createEphemeralKeyPair();

    const partialStateSecret = deriveNoteSecret(user.publicKey, ephPrivKey, grumpkin);

    const partialState = noteAlgos.valueNotePartialCommitment(partialStateSecret, user);
    const partialClaimNote = new TreeClaimNote(
      value,
      bridgeId,
      0, // defiInteractionNonce
      BigInt(0), // fee
      partialState,
      inputNullifier,
    );
    return { partialClaimNote, partialStateSecretEphPubKey: ephPubKey, partialStateSecret };
  };

  const generatePaymentProof = ({
    proofId = ProofId.SEND as PaymentProofId,
    proofSender = user,
    newNoteOwner = createUser(),
    assetId = 1,
    publicValue = 0n,
    outputNoteValue1 = 0n,
    outputNoteValue2 = 0n,
    txFee = 0n,
    publicOwner = EthAddress.ZERO,
    noteCommitmentNonce = user.nonce,
    isPadding = false,
    createValidNoteCommitments = true,
    txRefNo = 0,
  } = {}) => {
    const nullifier1 = isPadding
      ? Buffer.alloc(32)
      : noteAlgos.valueNoteNullifier(randomBytes(32), proofSender.privateKey);
    const nullifier2 = noteAlgos.valueNoteNullifier(randomBytes(32), proofSender.privateKey);
    const notes = [
      createNote(assetId, outputNoteValue1, new AccountId(newNoteOwner.publicKey, noteCommitmentNonce), nullifier1),
      createNote(assetId, outputNoteValue2, new AccountId(proofSender.publicKey, noteCommitmentNonce), nullifier2),
    ];
    const note1Commitment = createValidNoteCommitments ? noteAlgos.valueNoteCommitment(notes[0].note) : randomBytes(32);
    const note2Commitment = createValidNoteCommitments ? noteAlgos.valueNoteCommitment(notes[1].note) : randomBytes(32);
    const viewingKeys = isPadding ? [] : notes.map(n => n.viewingKey);
    const proofData = new InnerProofData(
      proofId,
      note1Commitment,
      note2Commitment,
      nullifier1,
      nullifier2,
      toBufferBE(publicValue, 32),
      publicOwner.toBuffer32(),
      numToUInt32BE(assetId, 32),
    );
    const offchainTxData = new OffchainJoinSplitData(viewingKeys, txRefNo);
    const tx = new CorePaymentTx(
      new TxId(proofData.txId),
      proofSender.id,
      proofId,
      assetId,
      publicValue,
      publicOwner,
      outputNoteValue1 + outputNoteValue2 + txFee,
      outputNoteValue1,
      outputNoteValue2,
      newNoteOwner.id.equals(user.id),
      proofSender.id.equals(user.id),
      txRefNo,
      new Date(),
    );
    return { proofData, offchainTxData, tx, outputNotes: notes.map(n => n.note) };
  };

  const generateAccountProof = ({
    accountCreator = user.id,
    alias = 'god',
    newSigningPubKey1 = GrumpkinAddress.randomAddress(),
    newSigningPubKey2 = GrumpkinAddress.randomAddress(),
    migrate = false,
    txRefNo = 0,
  } = {}) => {
    const { publicKey, accountNonce } = accountCreator;
    const aliasHash = AliasHash.fromAlias(alias, blake2s);
    const note1 = randomBytes(32);
    const note2 = randomBytes(32);
    const accountAliasId = new AccountAliasId(aliasHash!, accountNonce);
    const newAccountAliasId = new AccountAliasId(aliasHash!, accountNonce + +migrate);
    const nullifier1 = migrate ? noteAlgos.accountAliasIdNullifier(accountAliasId) : Buffer.alloc(32);
    const proofData = new InnerProofData(
      ProofId.ACCOUNT,
      note1,
      note2,
      nullifier1,
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
    );
    const offchainTxData = new OffchainAccountData(
      publicKey,
      newAccountAliasId,
      newSigningPubKey1.x(),
      newSigningPubKey2.x(),
      txRefNo,
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
    txFee = 0n,
    proofSender = user,
    claimNoteRecipient = user.id,
    txRefNo = 0,
  } = {}) => {
    const assetId = bridgeId.inputAssetIdA;
    const nullifier1 = noteAlgos.valueNoteNullifier(randomBytes(32), proofSender.privateKey);
    const nullifier2 = noteAlgos.valueNoteNullifier(randomBytes(32), proofSender.privateKey);
    const dummyNote = createNote(assetId, 0n, proofSender.id, randomBytes(32));
    const changeNote = createNote(assetId, outputNoteValue, proofSender.id, nullifier2);
    const { partialClaimNote, partialStateSecretEphPubKey, partialStateSecret } = createClaimNote(
      bridgeId,
      depositValue,
      claimNoteRecipient,
      nullifier1,
    );
    const partialClaimNoteCommitment = noteAlgos.claimNotePartialCommitment(partialClaimNote);
    const changeNoteCommitment = noteAlgos.valueNoteCommitment(changeNote.note);
    const viewingKeys = [changeNote.viewingKey];
    const proofData = new InnerProofData(
      ProofId.DEFI_DEPOSIT,
      partialClaimNoteCommitment,
      changeNoteCommitment,
      nullifier1,
      nullifier2,
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
    );
    const offchainTxData = new OffchainDefiDepositData(
      bridgeId,
      partialClaimNote.partialState,
      partialStateSecretEphPubKey,
      depositValue,
      txFee,
      viewingKeys[0],
      txRefNo,
    );
    const tx = new CoreDefiTx(
      new TxId(proofData.txId),
      proofSender.id,
      bridgeId,
      depositValue,
      txFee,
      partialStateSecret,
      txRefNo,
      new Date(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    return { proofData, offchainTxData, tx, outputNotes: [dummyNote.note, changeNote.note] };
  };

  const generateDefiClaimProof = ({
    noteRecipient = user,
    bridgeId = BridgeId.random(),
    outputValueA = 0n,
    outputValueB = 0n,
    nullifier1 = randomBytes(32),
    nullifier2 = randomBytes(32),
  } = {}) => {
    const assetId = bridgeId.inputAssetIdA;
    const notes = [
      createNote(assetId, outputValueA, noteRecipient.id, nullifier1),
      createNote(assetId, outputValueB, noteRecipient.id, nullifier2),
    ];
    const noteCommitments = [
      noteAlgos.valueNoteCommitment(notes[0].note),
      noteAlgos.valueNoteCommitment(notes[1].note),
    ];
    const proofData = new InnerProofData(
      ProofId.DEFI_CLAIM,
      noteCommitments[0],
      noteCommitments[1],
      nullifier1,
      nullifier2,
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
    );
    const offchainTxData = new OffchainDefiClaimData();
    return { proofData, offchainTxData };
  };

  const generateRollup = (
    rollupId = 0,
    innerProofs: InnerProofData[] = [],
    rollupSize = innerProofs.length,
    bridgeIds: BridgeId[] = [],
  ) => {
    const innerProofData = [...innerProofs];
    for (let i = innerProofs.length; i < rollupSize; ++i) {
      innerProofData.push(InnerProofData.PADDING);
    }
    return RollupProofData.randomData(rollupId, rollupSize, 0, innerProofData, bridgeIds);
  };

  const createBlock = (
    rollupProofData: RollupProofData,
    offchainTxData: Buffer[],
    interactionResult: DefiInteractionNote[] = [],
  ): Block =>
    new Block(
      TxHash.random(),
      new Date(),
      rollupProofData.rollupId,
      1,
      rollupProofData.toBuffer(),
      offchainTxData,
      interactionResult,
      0,
      0n,
    );

  const createRollupBlock = (
    innerProofs: { proofData: InnerProofData; offchainTxData: { toBuffer(): Buffer } }[] = [],
    {
      rollupId = 0,
      rollupSize = innerProofs.length,
      interactionResult = [] as DefiInteractionNote[],
      bridgeIds = [] as BridgeId[],
    } = {},
  ) => {
    const rollup = generateRollup(
      rollupId,
      innerProofs.map(p => p.proofData),
      rollupSize,
      bridgeIds,
    );
    const offchainTxData = innerProofs.map(p => p.offchainTxData.toBuffer());
    return createBlock(rollup, offchainTxData, interactionResult);
  };

  it('settle existing join split tx, add new note to db and nullify old note', async () => {
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;

    const jsProof = generatePaymentProof({ outputNoteValue1, outputNoteValue2 });
    const block = createRollupBlock([jsProof]);

    db.getPaymentTx.mockResolvedValue({ settled: undefined });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier2);
    expect(db.settlePaymentTx).toHaveBeenCalledTimes(1);
    expect(db.settlePaymentTx).toHaveBeenCalledWith(new TxId(jsProof.proofData.txId), user.id, block.created);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(0);
    expect(db.updateUser).toHaveBeenLastCalledWith({
      ...user,
      syncedToRollup: block.rollupId,
    });
  });

  it('add proof with pending notes, update the note status after settling the tx', async () => {
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;

    const jsProof = generatePaymentProof({ outputNoteValue1, outputNoteValue2 });
    const block = createRollupBlock([jsProof]);

    db.getPaymentTx.mockResolvedValue({ settled: undefined });

    const tx = { proofId: ProofId.SEND } as CorePaymentTx;
    const clientProofData = Buffer.concat([
      jsProof.proofData.toBuffer(),
      Buffer.alloc(32 * 7), // noteTreeRoot ... backwardLink
      Buffer.concat([Buffer.alloc(31), Buffer.from([2])]), // allowChain = 2
    ]);
    const proofOutput = {
      tx,
      proofData: new ProofData(clientProofData),
      offchainTxData: jsProof.offchainTxData,
      outputNotes: jsProof.outputNotes,
    };
    await userState.addProof(proofOutput);
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
      allowChain: true,
      pending: true,
    });
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx).toHaveBeenCalledWith(tx);
    db.addNote.mockClear();
    db.addPaymentTx.mockClear();

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
      allowChain: false,
      pending: false,
    });
    expect(db.addPaymentTx).toHaveBeenCalledTimes(0);
    expect(db.settlePaymentTx).toHaveBeenCalledTimes(1);
    expect(db.settlePaymentTx).toHaveBeenCalledWith(new TxId(jsProof.proofData.txId), user.id, block.created);
  });

  it('should correctly process multiple blocks', async () => {
    const jsProof1 = generatePaymentProof({ outputNoteValue1: 1n, outputNoteValue2: 2n });
    const block1 = createRollupBlock([jsProof1], { rollupId: 0, rollupSize: 2 });

    const accountProof = generateAccountProof({
      migrate: true,
    });
    const jsProof2 = generatePaymentProof({
      outputNoteValue1: 3n,
      outputNoteValue2: 4n,
    });
    const block2 = createRollupBlock([accountProof, jsProof2], { rollupId: 1, rollupSize: 2 });

    db.getPaymentTx.mockResolvedValue({ settled: undefined });

    await userState.handleBlocks([block1, block2]);

    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({ commitment: jsProof1.proofData.noteCommitment2, value: 2n });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({ commitment: jsProof2.proofData.noteCommitment2, value: 4n });
    expect(db.nullifyNote).toHaveBeenCalledTimes(4);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof1.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof1.proofData.nullifier2);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof2.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof2.proofData.nullifier1);
    expect(db.settlePaymentTx).toHaveBeenCalledTimes(2);
    expect(db.settlePaymentTx).toHaveBeenCalledWith(new TxId(jsProof1.proofData.txId), user.id, block1.created);
    expect(db.settlePaymentTx).toHaveBeenCalledWith(new TxId(jsProof2.proofData.txId), user.id, block2.created);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(0);
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
      .map((_, i) => createRollupBlock([generatePaymentProof()], { rollupId: i }));
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
    const block = createRollupBlock([generatePaymentProof({ proofSender: stranger, newNoteOwner: stranger })]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.settlePaymentTx).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(0);
  });

  it('do nothing if new notes owner has a different nonce', async () => {
    const newUserId = new AccountId(user.publicKey, user.nonce + 1);
    const block = createRollupBlock([
      generatePaymentProof({
        outputNoteValue1: 10n,
        outputNoteValue2: 20n,
        noteCommitmentNonce: newUserId.accountNonce,
        proofSender: { ...user, id: newUserId, nonce: newUserId.accountNonce },
        newNoteOwner: { ...user, id: newUserId, nonce: newUserId.accountNonce },
      }),
    ]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.settlePaymentTx).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(0);
  });

  it('restore a deposit tx and save to db', async () => {
    const assetId = 1;
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;
    const inputNoteValue = 70n;
    const publicValue = 60n;
    const publicOwner = EthAddress.randomAddress();

    const jsProof = generatePaymentProof({
      proofId: ProofId.DEPOSIT,
      assetId,
      outputNoteValue1,
      outputNoteValue2,
      publicValue,
      publicOwner,
    });
    const block = createRollupBlock([jsProof]);

    db.getNoteByNullifier.mockResolvedValueOnce({
      owner: user.id,
      value: inputNoteValue,
    });
    db.getNoteByNullifier.mockResolvedValueOnce({
      owner: user.id,
      value: 0n,
    });

    userState.processBlock(block);
    await userState.stopSync(true);

    const txId = new TxId(jsProof.proofData.txId);
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier2);
    expect(db.settlePaymentTx).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      txId,
      userId: user.id,
      assetId,
      publicValue,
      publicOwner,
      privateInput: inputNoteValue,
      recipientPrivateOutput: 0n,
      senderPrivateOutput: outputNoteValue2,
      isSender: true,
      settled: block.created,
    });
  });

  it('restore a withdraw tx and save to db', async () => {
    const proofId = ProofId.WITHDRAW;
    const assetId = 1;
    const outputNoteValue1 = 0n;
    const outputNoteValue2 = 10n;
    const inputNoteValue = 70n;
    const publicValue = 60n;
    const publicOwner = EthAddress.randomAddress();

    const jsProof = generatePaymentProof({
      proofId,
      assetId,
      outputNoteValue1,
      outputNoteValue2,
      publicValue,
      publicOwner,
      newNoteOwner: user,
    });
    const block = createRollupBlock([jsProof]);

    db.getNoteByNullifier.mockResolvedValueOnce({
      owner: user.id,
      value: inputNoteValue,
    });
    db.getNoteByNullifier.mockResolvedValueOnce({
      owner: user.id,
      value: 0n,
    });

    userState.processBlock(block);
    await userState.stopSync(true);

    const txId = new TxId(jsProof.proofData.txId);
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier2);
    expect(db.settlePaymentTx).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      txId,
      userId: user.id,
      assetId,
      publicValue,
      publicOwner,
      privateInput: inputNoteValue,
      recipientPrivateOutput: 0n,
      senderPrivateOutput: outputNoteValue2,
      isSender: true,
      settled: block.created,
    });
  });

  it('restore a transfer tx sent from another user to us', async () => {
    const proofId = ProofId.SEND;
    const proofSender = createUser();
    const outputNoteValue1 = 56n;
    const outputNoteValue2 = 78n;
    const jsProof = generatePaymentProof({
      proofId,
      proofSender,
      newNoteOwner: user,
      outputNoteValue1,
      outputNoteValue2,
    });
    const block = createRollupBlock([jsProof]);

    db.getNoteByNullifier.mockResolvedValue(undefined);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment1,
      value: outputNoteValue1,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      userId: user.id,
      privateInput: 0n,
      recipientPrivateOutput: outputNoteValue1,
      senderPrivateOutput: 0n,
      isSender: false,
      settled: block.created,
    });
  });

  it('restore a transfer tx sent from another local user to us', async () => {
    const proofId = ProofId.SEND;
    const proofSender = createUser();
    const outputNoteValue1 = 56n;
    const outputNoteValue2 = 78n;
    const jsProof = generatePaymentProof({
      proofId,
      proofSender,
      newNoteOwner: user,
      outputNoteValue1,
      outputNoteValue2,
    });
    const block = createRollupBlock([jsProof]);

    db.getNoteByNullifier.mockResolvedValue({ owner: proofSender.id });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment1,
      value: outputNoteValue1,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      userId: user.id,
      privateInput: 0n,
      recipientPrivateOutput: outputNoteValue1,
      senderPrivateOutput: 0n,
      isSender: false,
      settled: block.created,
    });
  });

  it('restore a transfer tx sent to another user', async () => {
    const proofId = ProofId.SEND;
    const outputNoteValue1 = 56n;
    const outputNoteValue2 = 78n;
    const jsProof = generatePaymentProof({
      proofId,
      newNoteOwner: createUser(),
      outputNoteValue1,
      outputNoteValue2,
    });
    const block = createRollupBlock([jsProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
    });
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      userId: user.id,
      recipientPrivateOutput: 0n,
      senderPrivateOutput: 78n,
      isSender: true,
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

    const txId = new TxId(accountProof.proofData.txId);
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
    expect(db.settleAccountTx).toHaveBeenCalledWith(txId, block.created);
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
      const newUserState = new UserState(newUser, grumpkin, noteAlgos, db as any, rollupProvider as any);

      db.getUser.mockResolvedValueOnce(newUser);
      await newUserState.init();
      await newUserState.startSync();

      expect(newUserState.getUser().aliasHash).toBe(undefined);

      newUserState.processBlock(block);
      await newUserState.stopSync(true);

      const txId = new TxId(accountProof.proofData.txId);

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
        txId,
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
    const outputNoteValue = 36n;
    const bridgeId = BridgeId.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const outputValueA = depositValue / 5n;
    const outputValueB = totalOutputValueB / 5n;
    const result = true;
    const rollupId = 4;

    const defiProof = generateDefiDepositProof({ bridgeId, outputNoteValue, depositValue });
    const defiProofInteractionNonce = rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;
    const interactionResult = [
      new DefiInteractionNote(
        bridgeId,
        defiProofInteractionNonce,
        totalInputValue,
        totalOutputValueA,
        totalOutputValueB,
        result,
      ),
      new DefiInteractionNote(BridgeId.random(), defiProofInteractionNonce + 1, 12n, 34n, 56n, result),
    ];
    const block = createRollupBlock([defiProof], {
      rollupId,
      interactionResult,
      bridgeIds: interactionResult.map(ir => ir.bridgeId),
    });
    const txId = new TxId(defiProof.proofData.txId);

    db.getDefiTx.mockResolvedValue({ settled: undefined });
    db.getDefiTxsByNonce.mockResolvedValue([]).mockResolvedValueOnce([{ txId, depositValue: depositValue }]);

    userState.processBlock(block);
    await userState.stopSync(true);

    const { partialStateSecretEphPubKey } = defiProof.offchainTxData;
    const partialStateSecret = deriveNoteSecret(partialStateSecretEphPubKey, user.privateKey, grumpkin);

    expect(db.addClaimTx).toHaveBeenCalledTimes(1);
    expect(db.addClaimTx.mock.calls[0][0]).toMatchObject({
      txId: txId,
      userId: user.id,
      secret: partialStateSecret,
    });
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: defiProof.proofData.noteCommitment2,
      value: outputNoteValue,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier2);
    expect(db.settleDefiDeposit).toHaveBeenCalledTimes(1);
    expect(db.settleDefiDeposit).toHaveBeenCalledWith(txId, defiProofInteractionNonce, false, block.created);
    // defi tx should have been updated
    expect(db.updateDefiTxFinalisationResult).toHaveBeenCalledTimes(1);
    expect(db.updateDefiTxFinalisationResult).toHaveBeenCalledWith(
      txId,
      result,
      outputValueA,
      outputValueB,
      block.created,
    );
    expect(db.addDefiTx).toHaveBeenCalledTimes(0);
    expect(db.settleDefiTx).toHaveBeenCalledTimes(0);
  });

  it('update a defi tx, add claim to db and nullify old notes - async defi', async () => {
    const outputNoteValue = 36n;
    const bridgeId = BridgeId.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const outputValueA = depositValue / 5n;
    const outputValueB = totalOutputValueB / 5n;
    const result = true;
    const rollupId = 4;

    const defiProof = generateDefiDepositProof({ bridgeId, outputNoteValue, depositValue });
    const defiProofInteractionNonce = rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

    // first rollup doesn't have defi result
    const block1 = createRollupBlock([defiProof], {
      rollupId,
      bridgeIds: [bridgeId, BridgeId.random(), BridgeId.random()],
      interactionResult: [
        new DefiInteractionNote(BridgeId.random(), defiProofInteractionNonce + 1, 12n, 34n, 56n, result),
      ],
    });
    const txId = new TxId(defiProof.proofData.txId);

    db.getDefiTx.mockResolvedValue({ settled: undefined });

    // create some other transaction to put into a rollup
    // the defi interaction result will go in this block
    const jsProof = generatePaymentProof({
      newNoteOwner: createUser(),
      outputNoteValue1: 56n,
      outputNoteValue2: 78n,
    });
    const block2 = createRollupBlock([jsProof], {
      rollupId: rollupId + 1,
      interactionResult: [
        new DefiInteractionNote(
          bridgeId,
          defiProofInteractionNonce,
          totalInputValue,
          totalOutputValueA,
          totalOutputValueB,
          result,
        ),
      ],
    });

    db.getDefiTxsByNonce.mockImplementation((_, nonce: number) =>
      nonce === defiProofInteractionNonce ? [{ txId, depositValue: depositValue }] : [],
    );

    userState.processBlock(block1);
    userState.processBlock(block2);
    await userState.stopSync(true);

    const { partialStateSecretEphPubKey } = defiProof.offchainTxData;
    const partialStateSecret = deriveNoteSecret(partialStateSecretEphPubKey, user.privateKey, grumpkin);

    //claim should dhave been created
    expect(db.addClaimTx).toHaveBeenCalledTimes(1);
    expect(db.addClaimTx.mock.calls[0][0]).toMatchObject({
      txId,
      secret: partialStateSecret,
      userId: user.id,
    });

    // defi inputs should have been nullified
    expect(db.nullifyNote).toHaveBeenCalledTimes(4);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier2);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier2);

    // defi tx should have been given nonce
    expect(db.settleDefiDeposit).toHaveBeenCalledTimes(1);
    expect(db.settleDefiDeposit).toHaveBeenCalledWith(
      defiProof.tx.txId,
      defiProofInteractionNonce,
      true,
      block1.created,
    );

    // defi tx should have been updated
    expect(db.updateDefiTxFinalisationResult).toHaveBeenCalledTimes(1);
    expect(db.updateDefiTxFinalisationResult).toHaveBeenCalledWith(
      txId,
      result,
      outputValueA,
      outputValueB,
      block2.created,
    );

    // claim output should have been created
    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: defiProof.proofData.noteCommitment2,
      value: outputNoteValue,
    });

    expect(db.addDefiTx).toHaveBeenCalledTimes(0);
    expect(db.settleDefiTx).toHaveBeenCalledTimes(0);
  });

  it('restore a defi tx and save to db, nullify input notes', async () => {
    const inputNoteValues = [70n, 30n];
    const outputNoteValue = 20n;
    const bridgeId = BridgeId.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const result = true;
    const rollupId = 5;
    const txFee = inputNoteValues[0] + inputNoteValues[1] - outputNoteValue - depositValue;

    const defiProof = generateDefiDepositProof({ bridgeId, outputNoteValue, depositValue, txFee });
    const defiProofInteractionNonce = rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;
    const interactionResult = [
      new DefiInteractionNote(
        bridgeId,
        defiProofInteractionNonce - 1,
        totalInputValue,
        totalOutputValueA,
        totalOutputValueB,
        result,
      ),
      new DefiInteractionNote(BridgeId.random(), defiProofInteractionNonce + 1, 12n, 34n, 56n, result),
    ];
    const block = createRollupBlock([defiProof], {
      rollupId,
      interactionResult,
      bridgeIds: [bridgeId],
    });

    db.getNoteByNullifier.mockResolvedValueOnce({
      owner: user.id,
      value: inputNoteValues[0],
    });
    db.getNoteByNullifier.mockResolvedValueOnce({
      owner: user.id,
      value: inputNoteValues[1],
    });

    const randomDefitX = { txId: TxId.random(), depositValue: 0n };
    db.getDefiTxsByNonce.mockImplementation((_, nonce) => (nonce === defiProofInteractionNonce ? [] : [randomDefitX]));

    userState.processBlock(block);
    await userState.stopSync(true);

    const txId = new TxId(defiProof.proofData.txId);
    expect(db.addClaimTx.mock.calls[0][0]).toMatchObject({
      txId,
      userId: user.id,
    });
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: defiProof.proofData.noteCommitment2,
      value: outputNoteValue,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier2);
    expect(db.addDefiTx).toHaveBeenCalledTimes(1);
    expect(db.addDefiTx).toHaveBeenCalledWith(
      expect.objectContaining({
        txId,
        userId: user.id,
        bridgeId,
        depositValue,
        txFee,
        settled: block.created,
        interactionNonce: defiProofInteractionNonce,
        isAsync: true,
        success: false,
        outputValueA: 0n,
        outputValueB: 0n,
      }),
    );
    // defi tx should have been updated
    expect(db.updateDefiTxFinalisationResult).toHaveBeenCalledTimes(2);
    expect(db.updateDefiTxFinalisationResult.mock.calls[0][0]).toEqual(randomDefitX.txId);
    expect(db.updateDefiTxFinalisationResult.mock.calls[1][0]).toEqual(randomDefitX.txId);
    expect(db.settleDefiTx).toHaveBeenCalledTimes(0);
  });

  it('settle a defi tx and add new notes', async () => {
    const bridgeId = BridgeId.random();
    const depositValue = 12n;
    const outputValueA = 34n;
    const outputValueB = 56n;
    const txId = TxId.random();
    const secret = randomBytes(32);
    const nullifier1 = randomBytes(32);
    const nullifier2 = randomBytes(32);
    const success = true;

    db.getClaimTx.mockImplementation(() => ({ txId, userId: user.id, secret }));
    db.getDefiTx.mockImplementation(() => ({ bridgeId, depositValue, outputValueA, outputValueB, success }));

    const claimProof = generateDefiClaimProof({ bridgeId, outputValueA, outputValueB, nullifier1, nullifier2 });
    const block = createRollupBlock([claimProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: claimProof.proofData.noteCommitment1,
      value: outputValueA,
      secret,
    });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({
      commitment: claimProof.proofData.noteCommitment2,
      value: outputValueB,
      secret,
    });
    expect(db.settleDefiTx).toHaveBeenCalledTimes(1);
    expect(db.settleDefiTx).toHaveBeenCalledWith(txId, block.created);
  });

  it('settle a defi tx and add refund note', async () => {
    const bridgeId = BridgeId.random();
    const depositValue = 12n;
    const outputValueA = 0n;
    const outputValueB = 0n;
    const txId = TxId.random();
    const secret = randomBytes(32);
    const nullifier1 = randomBytes(32);
    const nullifier2 = randomBytes(32);
    const result = false;

    db.getClaimTx.mockImplementation(() => ({ txId, userId: user.id, secret }));
    db.getDefiTx.mockImplementation(() => ({ bridgeId, depositValue, outputValueA, outputValueB, result }));

    const claimProof = generateDefiClaimProof({ bridgeId, outputValueA, outputValueB, nullifier1, nullifier2 });
    const block = createRollupBlock([claimProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: claimProof.proofData.noteCommitment1,
      value: depositValue,
      secret,
    });
    expect(db.settleDefiTx).toHaveBeenCalledTimes(1);
    expect(db.settleDefiTx).toHaveBeenCalledWith(txId, block.created);
  });

  it('add defi proof and its linked j/s proof, update the note status after the tx is settled', async () => {
    const jsTxFee = 2n;
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;
    const inputNoteValue = outputNoteValue1 + outputNoteValue2 + jsTxFee;
    const defiTxFee = 6n;
    const depositValue = outputNoteValue1 - defiTxFee;
    const outputValueA = 10n;
    const outputValueB = 20n;
    const bridgeId = BridgeId.random();
    const defiResult = true;

    const jsProof = generatePaymentProof({ newNoteOwner: user, outputNoteValue1, outputNoteValue2, txFee: jsTxFee });
    const jsProofData = Buffer.concat([
      jsProof.proofData.toBuffer(),
      Buffer.alloc(32 * 7), // noteTreeRoot ... backwardLink
      Buffer.concat([Buffer.alloc(31), Buffer.from([3])]), // allowChain = 3
    ]);
    const jsProofOutput = {
      tx: jsProof.tx,
      outputNotes: jsProof.outputNotes,
      proofData: new ProofData(jsProofData),
      offchainTxData: jsProof.offchainTxData,
    };

    const defiProof = generateDefiDepositProof({ bridgeId, depositValue });
    const defiProofData = Buffer.concat([
      defiProof.proofData.toBuffer(),
      Buffer.alloc(32 * 7), // noteTreeRoot ... backwardLink
      Buffer.alloc(32), // allowChain = 0
    ]);

    const defiProofOutput = {
      tx: defiProof.tx,
      outputNotes: defiProof.outputNotes,
      proofData: new ProofData(defiProofData),
      offchainTxData: defiProof.offchainTxData,
      jsProofOutput,
    };

    await userState.addProof(defiProofOutput);
    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(0);
    expect(db.addDefiTx).toHaveBeenCalledTimes(1);
    expect(db.addDefiTx).toHaveBeenCalledWith(defiProof.tx);

    db.addNote.mockClear();
    db.addDefiTx.mockClear();

    db.getDefiTx.mockResolvedValue({ settled: undefined });

    db.getNoteByNullifier.mockResolvedValueOnce({
      owner: user.id,
      value: inputNoteValue,
    });
    db.getNoteByNullifier.mockResolvedValueOnce({
      owner: user.id,
      value: 0n,
    });
    db.getNoteByNullifier.mockResolvedValueOnce({
      owner: user.id,
      value: outputNoteValue1,
    });

    const rollupId = 4;
    const defiProofInteractionNonce = rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;
    const interactionResult = [
      new DefiInteractionNote(
        bridgeId,
        defiProofInteractionNonce,
        depositValue,
        outputValueA,
        outputValueB,
        defiResult,
      ),
    ];
    const block = createRollupBlock([jsProof, defiProof], {
      rollupId,
      interactionResult,
      bridgeIds: [bridgeId],
    });
    db.getDefiTxsByNonce
      .mockResolvedValue([])
      .mockResolvedValueOnce([{ txId: defiProof.tx.txId, depositValue: depositValue }]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment1,
      value: outputNoteValue1,
      allowChain: false,
      pending: false,
    });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
      allowChain: false,
      pending: false,
    });
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.settlePaymentTx).toHaveBeenCalledTimes(0);

    expect(db.settleDefiDeposit).toHaveBeenCalledTimes(1);
    expect(db.settleDefiDeposit).toHaveBeenCalledWith(
      defiProof.tx.txId,
      defiProofInteractionNonce,
      false,
      block.created,
    );

    expect(db.addDefiTx).toHaveBeenCalledTimes(0);
    expect(db.updateDefiTxFinalisationResult).toHaveBeenCalledTimes(1);
    expect(db.updateDefiTxFinalisationResult).toHaveBeenCalledWith(
      new TxHash(defiProof.proofData.txId),
      defiResult,
      outputValueA,
      outputValueB,
      block.created,
    );
  });

  it('ignore a defi claim proof for account with a different nonce', async () => {
    const bridgeId = BridgeId.random();
    const depositValue = 12n;
    const outputValueA = 34n;
    const outputValueB = 56n;
    const txId = TxId.random();
    const secret = randomBytes(32);
    const nullifier1 = randomBytes(32);
    const nullifier2 = randomBytes(32);

    db.getClaimTx.mockImplementation(() => ({
      txId,
      userId: new AccountId(user.id.publicKey, user.id.accountNonce + 1),
      secret,
    }));
    db.getDefiTx.mockImplementation(() => ({ bridgeId, depositValue, outputValueA, outputValueB }));

    const claimProof = generateDefiClaimProof({ bridgeId, outputValueA, outputValueB, nullifier1, nullifier2 });
    const block = createRollupBlock([claimProof]);

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.settleDefiTx).toHaveBeenCalledTimes(0);
  });

  it('should not add notes with incorrect commitments', async () => {
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;

    const jsProof = generatePaymentProof({
      outputNoteValue1,
      outputNoteValue2,
      createValidNoteCommitments: false,
    });
    const block = createRollupBlock([jsProof]);

    db.getPaymentTx.mockResolvedValue({ settled: undefined });

    userState.processBlock(block);
    await userState.stopSync(true);

    expect(db.addNote).toHaveBeenCalledTimes(0);
  });

  it('remove orphaned txs and notes', async () => {
    const unsettledUserTxs = [...Array(4)].map(() => TxId.random());
    db.getPendingUserTxs.mockResolvedValue(unsettledUserTxs);

    const pendingNotes = [...Array(6)].map(() => ({ commitment: randomBytes(32), nullifier: randomBytes(32) }));
    db.getUserPendingNotes.mockResolvedValue(pendingNotes);

    const pendingTxs = [
      { txId: TxId.random(), noteCommitment1: pendingNotes[1].commitment, noteCommitment2: randomBytes(32) },
      { txId: unsettledUserTxs[1], noteCommitment1: randomBytes(32), noteCommitment2: pendingNotes[2].commitment },
      { txId: TxId.random(), noteCommitment1: randomBytes(32), noteCommitment2: randomBytes(32) },
      {
        txId: unsettledUserTxs[3],
        noteCommitment1: pendingNotes[4].commitment,
        noteCommitment2: pendingNotes[5].commitment,
      },
    ];
    rollupProvider.getPendingTxs.mockResolvedValue(pendingTxs);

    userState = new UserState(user, grumpkin, noteAlgos, db as any, rollupProvider as any);
    await userState.init();

    expect(db.removeUserTx).toHaveBeenCalledTimes(2);
    expect(db.removeUserTx).toHaveBeenCalledWith(unsettledUserTxs[0], user.id);
    expect(db.removeUserTx).toHaveBeenCalledWith(unsettledUserTxs[2], user.id);
    expect(db.removeNote).toHaveBeenCalledTimes(2);
    expect(db.removeNote).toHaveBeenCalledWith(pendingNotes[0].nullifier);
    expect(db.removeNote).toHaveBeenCalledWith(pendingNotes[3].nullifier);
  });
});
