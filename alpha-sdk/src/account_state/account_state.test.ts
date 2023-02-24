import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxHash } from '@aztec/barretenberg/blockchain';
import { Block, DefiInteractionEvent } from '@aztec/barretenberg/block_source';
import { BridgeCallData, virtualAssetIdFlag, virtualAssetIdPlaceholder } from '@aztec/barretenberg/bridge_call_data';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Schnorr } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { deriveNoteSecret, NoteAlgorithms, TreeClaimNote, TreeNote } from '@aztec/barretenberg/note_algorithms';
import {
  OffchainAccountData,
  OffchainDefiClaimData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { jest } from '@jest/globals';
import { randomBytes } from 'crypto';
import { AztecWalletProvider, VanillaAztecWalletProviderFactory } from '../aztec_wallet_provider/index.js';
import { BlockContext } from '../block_context/index.js';
import { BlockProcessor } from '../block_processor/index.js';
import { CoreDefiTx, CorePaymentTx, PaymentProofId } from '../core_tx/index.js';
import { Database } from '../database/index.js';
import { ConstantKeyPair, ConstantKeyStore, KeyPair } from '../key_store/index.js';
import { Note } from '../note/index.js';
import { AccountState } from './index.js';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

interface TestAccount {
  accountKeyPair: KeyPair;
  spendingKeyPair: KeyPair;
  publicKey: GrumpkinAddress;
  privateKey: Buffer;
}

describe('account state', () => {
  let grumpkin: Grumpkin;
  let schnorr: Schnorr;
  let noteAlgos: NoteAlgorithms;
  let db: Mockify<Database>;
  let rollupProvider: Mockify<RollupProvider>;
  let blockProcessor: BlockProcessor;
  let aztecWalletProviderFactory: VanillaAztecWalletProviderFactory;
  let accountState: AccountState;
  let account: TestAccount;
  let aztecWalletProvider: AztecWalletProvider;
  let generatedHashPaths: { [key: number]: HashPath } = {};
  let inputNotes: Note[] = [];

  const createEphemeralPrivKey = () => grumpkin.getRandomFr();

  const createEphemeralKeyPair = () => {
    const ephPrivKey = grumpkin.getRandomFr();
    const ephPubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.generator, ephPrivKey));
    return { ephPrivKey, ephPubKey };
  };

  const createAccount = (): TestAccount => {
    const privateKey = randomBytes(32);
    const publicKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.generator, privateKey));
    const accountKeyPair = new ConstantKeyPair(publicKey, privateKey, schnorr);
    const spendingKeyPair = ConstantKeyPair.random(grumpkin, schnorr);
    return {
      accountKeyPair,
      spendingKeyPair,
      publicKey,
      privateKey,
    };
  };

  const createHashPath = (depth: number) => {
    const bufs: Buffer[][] = [];
    for (let i = 0; i < depth; i++) {
      bufs.push([randomBytes(32), randomBytes(32)]);
    }
    return new HashPath(bufs);
  };

  const createBlockContext = (block: Block) => {
    const decoded = RollupProofData.decode(block.encodedRollupProofData);
    return {
      rollup: decoded,
      mined: block.mined,
      offchainTxData: block.offchainTxData,
      interactionResult: block.interactionResult,
      getBlockSubtreeHashPath: function (index: number) {
        const path = createHashPath(11);
        generatedHashPaths[index] = path;
        return Promise.resolve(path);
      },
    } as BlockContext;
  };

  const addInputNote = (
    ownerPublicKey: GrumpkinAddress,
    spendingKeyRequired: boolean,
    assetId: number,
    value: bigint,
    nullifier: Buffer,
  ) => {
    const treeNote = new TreeNote(
      ownerPublicKey,
      value,
      assetId,
      spendingKeyRequired,
      randomBytes(32),
      Buffer.alloc(32),
      randomBytes(32),
    );
    const note = new Note(treeNote, randomBytes(32), nullifier, true, false);
    inputNotes.push(note);
    return note;
  };

  beforeAll(async () => {
    const barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
    schnorr = new Schnorr(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);
    aztecWalletProviderFactory = await VanillaAztecWalletProviderFactory.new(true, barretenberg, undefined, 0);
  });

  beforeEach(async () => {
    db = {
      getPaymentTx: jest.fn(),
      addPaymentTx: jest.fn(),
      getAccountTx: jest.fn(),
      addAccountTx: jest.fn(),
      getDefiTx: jest.fn(),
      addDefiTx: jest.fn(),
      getPendingTxs: jest.fn<any>().mockResolvedValue([]),
      removeTx: jest.fn(),
      addNote: jest.fn<any>().mockImplementation(note => {
        inputNotes = inputNotes.filter(n => !n.nullifier.equals(note.nullifier));
        inputNotes.push(note);
      }),
      nullifyNote: jest.fn(),
      getNoteByNullifier: jest.fn((nullifier: Buffer) => inputNotes.find(n => n.nullifier.equals(nullifier))),
      getPendingNotes: jest.fn<any>().mockResolvedValue([]),
      removeNote: jest.fn(),
      addClaimTx: jest.fn(),
      getClaimTx: jest.fn(),
      getNotes: jest.fn<any>().mockResolvedValue([]),
      getAccount: jest.fn().mockImplementation(accountPublicKey => ({ accountPublicKey, syncedToRollup: -1 })),
      addAccount: jest.fn(),
      addSpendingKey: jest.fn(),
      getDefiTxsByNonce: jest.fn(),
    } as any;

    rollupProvider = {
      getLatestRollupId: jest.fn<any>().mockResolvedValue(0),
      getBlocks: jest.fn<any>().mockResolvedValue([]),
      getPendingTxs: jest.fn<any>().mockResolvedValue([]),
    } as any;

    inputNotes = [];
    generatedHashPaths = {};

    blockProcessor = new BlockProcessor(noteAlgos, db);

    account = createAccount();

    const keyStore = new ConstantKeyStore(account.accountKeyPair, account.spendingKeyPair);
    (aztecWalletProvider = aztecWalletProviderFactory.create(keyStore, rollupProvider)),
      await aztecWalletProvider.connect();

    accountState = new AccountState(aztecWalletProvider, blockProcessor, rollupProvider as any, db as any);
    await accountState.init();
  });

  const createNote = (
    assetId: number,
    value: bigint,
    owner: TestAccount,
    userAccountRequired: boolean,
    inputNullifier: Buffer,
    allowChain: boolean,
  ) => {
    const ephPrivKey = createEphemeralPrivKey();
    const treeNote = TreeNote.createFromEphPriv(
      owner.publicKey,
      value,
      assetId,
      userAccountRequired,
      inputNullifier,
      ephPrivKey,
      grumpkin,
    );
    const commitment = noteAlgos.valueNoteCommitment(treeNote);
    const nullifier = noteAlgos.valueNoteNullifier(commitment, owner.privateKey);
    const note = new Note(treeNote, commitment, nullifier, allowChain, false);
    const viewingKey = treeNote.createViewingKey(ephPrivKey, grumpkin);
    return { note, viewingKey };
  };

  const createClaimNote = (
    bridgeCallData: BridgeCallData,
    value: bigint,
    accountPublicKey: GrumpkinAddress,
    userAccountRequired: boolean,
    inputNullifier: Buffer,
  ) => {
    const { ephPrivKey, ephPubKey } = createEphemeralKeyPair();

    const partialStateSecret = deriveNoteSecret(accountPublicKey, ephPrivKey, grumpkin);

    const partialState = noteAlgos.valueNotePartialCommitment(
      partialStateSecret,
      accountPublicKey,
      userAccountRequired,
    );
    const partialClaimNote = new TreeClaimNote(
      value,
      bridgeCallData,
      0, // defiInteractionNonce
      BigInt(0), // fee
      partialState,
      inputNullifier,
    );
    return { partialClaimNote, partialStateSecretEphPubKey: ephPubKey, partialStateSecret };
  };

  const generatePaymentProof = ({
    proofId = ProofId.SEND as PaymentProofId,
    proofSender = account,
    proofSenderAccountRequired = true,
    newNoteOwner = createAccount(),
    newNoteSpendingKeyRequired = true,
    assetId = 1,
    inputNoteValue1 = 0n,
    inputNoteNullifier1 = Buffer.alloc(0),
    inputNoteValue2 = 0n,
    inputNoteNullifier2 = Buffer.alloc(0),
    outputNoteValue1 = 0n,
    outputNoteValue2 = 0n,
    publicValue = 0n,
    publicOwner = EthAddress.ZERO,
    allowChain = 0,
    createValidNoteCommitments = true,
    txRefNo = 0,
  } = {}) => {
    const inputNullifier1 = inputNoteNullifier1.length
      ? inputNoteNullifier1
      : noteAlgos.valueNoteNullifier(randomBytes(32), proofSender.privateKey);
    const inputNullifier2 = inputNoteNullifier2.length
      ? inputNoteNullifier2
      : noteAlgos.valueNoteNullifier(randomBytes(32), proofSender.privateKey);

    // Input notes
    const inputNotes: Note[] = [];
    if (inputNoteValue1) {
      inputNotes.push(
        addInputNote(proofSender.publicKey, proofSenderAccountRequired, assetId, inputNoteValue1, inputNullifier1),
      );
    }
    if (inputNoteValue2) {
      inputNotes.push(
        addInputNote(proofSender.publicKey, proofSenderAccountRequired, assetId, inputNoteValue2, inputNullifier2),
      );
    }
    const privateInput = inputNoteValue1 + inputNoteValue2;

    // Output notes
    const notes = [
      createNote(
        assetId,
        outputNoteValue1,
        newNoteOwner,
        newNoteSpendingKeyRequired,
        inputNullifier1,
        [1, 3].includes(allowChain),
      ),
      createNote(
        assetId,
        outputNoteValue2,
        proofSender,
        proofSenderAccountRequired,
        inputNullifier2,
        [2, 3].includes(allowChain),
      ),
    ];
    const note1Commitment = createValidNoteCommitments ? notes[0].note.commitment : randomBytes(32);
    const note2Commitment = createValidNoteCommitments ? notes[1].note.commitment : randomBytes(32);
    const viewingKeys = notes.map(n => n.viewingKey);

    const proofData = new InnerProofData(
      proofId,
      note1Commitment,
      note2Commitment,
      inputNullifier1,
      inputNullifier2,
      toBufferBE(publicValue, 32),
      publicOwner.toBuffer32(),
      Buffer.alloc(32),
    );

    const offchainTxData = new OffchainJoinSplitData(viewingKeys, txRefNo);

    const tx = new CorePaymentTx(
      new TxId(proofData.txId),
      proofSender.publicKey,
      proofId,
      assetId,
      publicValue,
      publicValue ? publicOwner : undefined,
      privateInput,
      outputNoteValue1,
      outputNoteValue2,
      newNoteOwner.publicKey.equals(account.publicKey),
      proofSender.publicKey.equals(account.publicKey),
      txRefNo,
      new Date(),
    );

    return { proofData, offchainTxData, tx, inputNotes, outputNotes: notes.map(n => n.note) };
  };

  const generateDepositProof = ({
    recipient = account,
    newNoteSpendingKeyRequired = true,
    assetId = 1,
    depositValue = 100n,
    ethAddress = EthAddress.random(),
    txFee = 8n,
    txRefNo = 0,
    createValidNoteCommitments = true,
  } = {}) =>
    generatePaymentProof({
      proofId: ProofId.DEPOSIT,
      newNoteOwner: recipient,
      newNoteSpendingKeyRequired,
      assetId,
      outputNoteValue1: depositValue,
      publicValue: depositValue + txFee,
      publicOwner: ethAddress,
      createValidNoteCommitments,
      txRefNo,
    });

  const generateWithdrawProof = ({
    proofSender = account,
    proofSenderAccountRequired = true,
    recipient = EthAddress.random(),
    assetId = 1,
    inputNoteValue1 = 60n,
    inputNoteValue2 = 40n,
    withdrawValue = 100n,
    txFee = 8n,
    txRefNo = 0,
    createValidNoteCommitments = true,
  } = {}) =>
    generatePaymentProof({
      proofId: ProofId.WITHDRAW,
      proofSender,
      proofSenderAccountRequired,
      newNoteOwner: proofSender,
      newNoteSpendingKeyRequired: proofSenderAccountRequired,
      assetId,
      inputNoteValue1,
      inputNoteValue2,
      outputNoteValue1: 0n,
      outputNoteValue2: inputNoteValue1 + inputNoteValue2 - withdrawValue - txFee,
      publicValue: withdrawValue + txFee,
      publicOwner: recipient,
      createValidNoteCommitments,
      txRefNo,
    });

  const generateTransferProof = ({
    proofSender = account,
    proofSenderAccountRequired = true,
    newNoteOwner = createAccount(),
    newNoteSpendingKeyRequired = true,
    assetId = 1,
    inputNoteValue1 = 80n,
    inputNoteValue2 = 40n,
    transferValue = 100n,
    txFee = 8n,
    allowChain = 2,
    createValidNoteCommitments = true,
    txRefNo = 0,
  } = {}) =>
    generatePaymentProof({
      proofId: ProofId.SEND,
      proofSender,
      proofSenderAccountRequired,
      newNoteOwner,
      newNoteSpendingKeyRequired,
      assetId,
      inputNoteValue1,
      inputNoteValue2,
      outputNoteValue1: transferValue,
      outputNoteValue2: inputNoteValue1 + inputNoteValue2 - transferValue - txFee,
      allowChain,
      createValidNoteCommitments,
      txRefNo,
    });

  const generateAccountProof = ({
    accountPublicKey = account.publicKey,
    aliasHash = AliasHash.random(),
    newAccountPublicKey = accountPublicKey,
    newSpendingPublicKey1 = GrumpkinAddress.random(),
    newSpendingPublicKey2 = GrumpkinAddress.random(),
    txRefNo = 0,
  } = {}) => {
    const create = newAccountPublicKey.equals(accountPublicKey);
    const migrate = !create;
    const note1 = randomBytes(32);
    const note2 = randomBytes(32);
    const nullifier1 = create ? noteAlgos.accountAliasHashNullifier(aliasHash) : Buffer.alloc(32);
    const nullifier2 = create || migrate ? noteAlgos.accountPublicKeyNullifier(accountPublicKey) : Buffer.alloc(32);
    const proofData = new InnerProofData(
      ProofId.ACCOUNT,
      note1,
      note2,
      nullifier1,
      nullifier2,
      Buffer.alloc(32),
      Buffer.alloc(32),
      Buffer.alloc(32),
    );
    const offchainTxData = new OffchainAccountData(
      newAccountPublicKey,
      aliasHash,
      newSpendingPublicKey1.x(),
      newSpendingPublicKey2.x(),
      txRefNo,
    );
    return {
      proofData,
      offchainTxData,
    };
  };

  const generateDefiDepositProof = ({
    bridgeCallData = BridgeCallData.random(),
    inputNoteValue1 = 0n,
    inputNoteValue2 = 0n,
    outputNoteValue = 0n,
    depositValue = 0n,
    txFee = 0n,
    proofSender = account,
    proofSenderAccountRequired = true,
    claimNoteRecipient = account.publicKey,
    txRefNo = 0,
  } = {}) => {
    const assetId = bridgeCallData.inputAssetIdA;
    const nullifier1 = noteAlgos.valueNoteNullifier(randomBytes(32), proofSender.privateKey);
    const nullifier2 = noteAlgos.valueNoteNullifier(randomBytes(32), proofSender.privateKey);
    addInputNote(proofSender.publicKey, true, assetId, inputNoteValue1, nullifier1);
    addInputNote(proofSender.publicKey, true, assetId, inputNoteValue2, nullifier2);

    const dummyNote = createNote(assetId, 0n, proofSender, proofSenderAccountRequired, randomBytes(32), true);
    const changeNote = createNote(assetId, outputNoteValue, proofSender, proofSenderAccountRequired, nullifier2, true);
    const { partialClaimNote, partialStateSecretEphPubKey } = createClaimNote(
      bridgeCallData,
      depositValue,
      claimNoteRecipient,
      proofSenderAccountRequired,
      nullifier1,
    );
    const partialClaimNoteCommitment = noteAlgos.claimNotePartialCommitment(partialClaimNote);
    const changeNoteCommitment = changeNote.note.commitment;
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
      bridgeCallData,
      partialClaimNote.partialState,
      partialStateSecretEphPubKey,
      depositValue,
      txFee,
      viewingKeys[0],
      txRefNo,
    );
    const tx = new CoreDefiTx(
      new TxId(proofData.txId),
      proofSender.publicKey,
      bridgeCallData,
      depositValue,
      txFee,
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
    owner = account,
    accountRequired = true,
    bridgeCallData = BridgeCallData.random(),
    outputValueA = 0n,
    outputValueB = 0n,
    nullifier1 = randomBytes(32),
    nullifier2 = randomBytes(32),
  } = {}) => {
    const assetId = bridgeCallData.inputAssetIdA;
    const notes = [
      createNote(assetId, outputValueA, owner, accountRequired, nullifier1, false),
      createNote(assetId, outputValueB, owner, accountRequired, nullifier2, false),
    ];
    const proofData = new InnerProofData(
      ProofId.DEFI_CLAIM,
      notes[0].note.commitment,
      notes[1].note.commitment,
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
    bridgeCallDatas: BridgeCallData[] = [],
    dataStartIndex = 0,
  ) => {
    const innerProofData = [...innerProofs];
    for (let i = innerProofs.length; i < rollupSize; ++i) {
      innerProofData.push(InnerProofData.PADDING);
    }
    return RollupProofData.randomData(rollupId, rollupSize, dataStartIndex, innerProofData, bridgeCallDatas);
  };

  const createBlock = (
    rollupProofData: RollupProofData,
    offchainTxData: Buffer[],
    interactionResult: DefiInteractionEvent[] = [],
  ): Block =>
    new Block(
      TxHash.random(),
      new Date(),
      rollupProofData.rollupId,
      1,
      rollupProofData.encode(),
      offchainTxData,
      interactionResult,
      0,
      0n,
    );

  const createRollupBlock = (
    innerProofs: { proofData: InnerProofData; offchainTxData: { toBuffer(): Buffer } }[] = [],
    {
      rollupId = 0,
      dataStartIndex = 0,
      rollupSize = innerProofs.length,
      interactionResult = [] as DefiInteractionEvent[],
      bridgeCallDatas = [] as BridgeCallData[],
    } = {},
  ) => {
    const rollup = generateRollup(
      rollupId,
      innerProofs.map(p => p.proofData),
      rollupSize,
      bridgeCallDatas,
      dataStartIndex,
    );
    const offchainTxData = innerProofs.map(p => p.offchainTxData.toBuffer());
    return createBlock(rollup, offchainTxData, interactionResult);
  };

  it('add settled join split tx, add new note to db and nullify old note', async () => {
    const jsProof = generateTransferProof();
    const block = createRollupBlock([jsProof]);
    const { proofData, tx } = jsProof;

    db.getPaymentTx.mockResolvedValue(tx);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: proofData.noteCommitment2,
      value: tx.senderPrivateOutput,
      hashPath: generatedHashPaths[1].toBuffer(),
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(proofData.nullifier2);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx).toHaveBeenCalledWith({
      ...tx,
      settled: block.mined,
    });
    expect(db.addAccount).toHaveBeenLastCalledWith({
      accountPublicKey: account.publicKey,
      syncedToRollup: block.rollupId,
    });
  });

  it('add proof with pending notes, update the note status after settling the tx', async () => {
    const jsProof = generateTransferProof();
    const block = createRollupBlock([jsProof]);
    const tx = jsProof.tx;

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
    await accountState.addProof(proofOutput);

    db.getPaymentTx.mockResolvedValue(tx);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: jsProof.tx.senderPrivateOutput,
      allowChain: true,
      pending: true,
      hashPath: undefined,
    });
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx).toHaveBeenCalledWith(tx);
    db.addNote.mockClear();
    db.addPaymentTx.mockClear();

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: jsProof.tx.senderPrivateOutput,
      allowChain: false,
      pending: false,
      hashPath: generatedHashPaths[1].toBuffer(),
    });
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx).toHaveBeenCalledWith({
      ...tx,
      settled: block.mined,
    });
  });

  it('should correctly process multiple blocks', async () => {
    const jsProof1 = generateTransferProof({
      inputNoteValue1: 6n,
      inputNoteValue2: 4n,
      transferValue: 3n,
      txFee: 2n,
    });
    const block1 = createRollupBlock([jsProof1], { rollupId: 0, rollupSize: 2, dataStartIndex: 0 });

    const accountProof = generateAccountProof();
    const jsProof2 = generateTransferProof({
      inputNoteValue1: 30n,
      inputNoteValue2: 40n,
      transferValue: 35n,
      txFee: 3n,
    });
    const block2 = createRollupBlock([accountProof, jsProof2], { rollupId: 1, rollupSize: 2, dataStartIndex: 4 });

    db.getPaymentTx.mockImplementation((accountPublicKey, txId) =>
      [jsProof1.tx, jsProof2.tx].find(tx => tx.accountPublicKey.equals(accountPublicKey) && tx.txId.equals(txId)),
    );
    rollupProvider.getBlocks.mockResolvedValue([block1, block2]);

    await accountState.processBlocks([block1, block2].map(x => createBlockContext(x)));

    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof1.proofData.noteCommitment2,
      value: 6n + 4n - 3n - 2n,
      hashPath: generatedHashPaths[1].toBuffer(),
    });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({
      commitment: jsProof2.proofData.noteCommitment2,
      value: 30n + 40n - 35n - 3n,
      hashPath: generatedHashPaths[7].toBuffer(),
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(4);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof1.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof1.proofData.nullifier2);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof2.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof2.proofData.nullifier1);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(2);
    expect(db.addPaymentTx).toHaveBeenCalledWith({
      ...jsProof1.tx,
      settled: block1.mined,
    });
    expect(db.addPaymentTx).toHaveBeenCalledWith({
      ...jsProof2.tx,
      settled: block2.mined,
    });
    expect(db.addAccount).toHaveBeenCalledTimes(1);
    expect(db.addAccount).toHaveBeenLastCalledWith({
      accountPublicKey: account.publicKey,
      syncedToRollup: block2.rollupId,
    });
  });

  it('should correctly update syncedToRollup', async () => {
    expect(accountState.getSyncedToRollup()).toBe(-1);

    const blocks = Array(5)
      .fill(0)
      .map((_, i) => createRollupBlock([generatePaymentProof()], { rollupId: i }));
    rollupProvider.getBlocks.mockResolvedValue(blocks);

    await accountState.processBlocks(blocks.map(x => createBlockContext(x)));

    expect(accountState.getSyncedToRollup()).toBe(4);

    const paddingBlocks = Array(3)
      .fill(0)
      .map((_, i) => createRollupBlock([], { rollupId: 5 + i, rollupSize: 1 }));
    rollupProvider.getBlocks.mockResolvedValue(paddingBlocks);

    await accountState.processBlocks(paddingBlocks.map(x => createBlockContext(x)));

    expect(accountState.getSyncedToRollup()).toBe(7);
  });

  it('do nothing if it cannot decrypt new notes', async () => {
    const stranger = createAccount();
    const block = createRollupBlock([generatePaymentProof({ proofSender: stranger, newNoteOwner: stranger })]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(0);
  });

  it('restore a deposit tx and save to db', async () => {
    const depositValue = 100n;
    const txFee = 8n;
    const ethAddress = EthAddress.random();

    const jsProof = generateDepositProof({
      depositValue,
      txFee,
      ethAddress,
    });
    const block = createRollupBlock([jsProof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    const txId = new TxId(jsProof.proofData.txId);
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment1,
      value: depositValue,
      hashPath: generatedHashPaths[0].toBuffer(),
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      txId,
      accountPublicKey: account.publicKey,
      publicValue: depositValue + txFee,
      publicOwner: ethAddress,
      privateInput: 0n,
      recipientPrivateOutput: depositValue,
      senderPrivateOutput: 0n,
      isRecipient: true,
      settled: block.mined,
    });
  });

  it('restore a withdraw tx and save to db', async () => {
    const inputNoteValue1 = 70n;
    const inputNoteValue2 = 40n;
    const withdrawValue = 100n;
    const txFee = 8n;
    const recipient = EthAddress.random();

    const jsProof = generateWithdrawProof({
      inputNoteValue1,
      inputNoteValue2,
      withdrawValue,
      txFee,
      recipient,
    });
    const block = createRollupBlock([jsProof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    const txId = new TxId(jsProof.proofData.txId);
    const changeValue = inputNoteValue1 + inputNoteValue2 - withdrawValue - txFee;
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: changeValue,
      hashPath: generatedHashPaths[1].toBuffer(),
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier2);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      txId,
      accountPublicKey: account.publicKey,
      publicValue: withdrawValue + txFee,
      publicOwner: recipient,
      privateInput: inputNoteValue1 + inputNoteValue2,
      recipientPrivateOutput: 0n,
      senderPrivateOutput: changeValue,
      isSender: true,
      settled: block.mined,
    });
  });

  it('restore a transfer tx sent from another user to us', async () => {
    const proofSender = createAccount();
    const proof = generateTransferProof({
      proofSender,
      newNoteOwner: account,
    });
    const block = createRollupBlock([proof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    db.getNoteByNullifier.mockResolvedValue(undefined);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: proof.proofData.noteCommitment1,
      value: proof.tx.recipientPrivateOutput,
      hashPath: generatedHashPaths[0].toBuffer(),
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      accountPublicKey: account.publicKey,
      privateInput: 0n,
      recipientPrivateOutput: proof.tx.recipientPrivateOutput,
      senderPrivateOutput: 0n,
      isSender: false,
      isRecipient: true,
      settled: block.mined,
    });
  });

  it('restore a transfer tx sent from another local user to us', async () => {
    const proofSender = createAccount();
    const proof = generateTransferProof({
      proofSender,
      newNoteOwner: account,
    });
    const block = createRollupBlock([proof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: proof.proofData.noteCommitment1,
      value: proof.tx.recipientPrivateOutput,
      hashPath: generatedHashPaths[0].toBuffer(),
    });

    // Will not nullify the notes even when they are in db.
    expect(db.getNoteByNullifier(proof.proofData.nullifier1)).not.toBeUndefined();
    expect(db.getNoteByNullifier(proof.proofData.nullifier2)).not.toBeUndefined();
    expect(db.nullifyNote).toHaveBeenCalledTimes(0);

    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      accountPublicKey: account.publicKey,
      privateInput: 0n,
      recipientPrivateOutput: proof.tx.recipientPrivateOutput,
      senderPrivateOutput: 0n,
      isSender: false,
      isRecipient: true,
      settled: block.mined,
    });
  });

  it('restore a transfer tx sent to another user', async () => {
    const proof = generateTransferProof();
    const block = createRollupBlock([proof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: proof.proofData.noteCommitment2,
      value: proof.tx.senderPrivateOutput,
      hashPath: generatedHashPaths[1].toBuffer(),
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);
    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      accountPublicKey: account.publicKey,
      recipientPrivateOutput: 0n,
      senderPrivateOutput: proof.tx.senderPrivateOutput,
      isSender: true,
      isRecipient: false,
      settled: block.mined,
    });
  });

  it('restore a transfer tx sent from unregistered to registered account', async () => {
    const proof = generateTransferProof({
      proofSender: account,
      proofSenderAccountRequired: false,
      newNoteOwner: account,
      newNoteSpendingKeyRequired: true,
    });
    const block = createRollupBlock([proof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      accountPublicKey: account.publicKey,
      isRecipient: true,
      isSender: true,
    });
  });

  it('restore a transfer tx sent from registered to unregistered account', async () => {
    const proof = generateTransferProof({
      proofSender: account,
      proofSenderAccountRequired: true,
      newNoteOwner: account,
      newNoteSpendingKeyRequired: false,
    });
    const block = createRollupBlock([proof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      accountPublicKey: account.publicKey,
      isRecipient: true,
      isSender: true,
    });
  });

  it('restore a transfer tx sent to unregistered account from someone else', async () => {
    const proofSender = createAccount();
    const proof = generateTransferProof({
      proofSender,
      newNoteOwner: account,
      newNoteSpendingKeyRequired: false,
    });
    const block = createRollupBlock([proof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addPaymentTx.mock.calls[0][0]).toMatchObject({
      accountPublicKey: account.publicKey,
      isRecipient: true,
      isSender: false,
    });
  });

  it('should settle account tx and add spending keys for user', async () => {
    const newSpendingPublicKey1 = GrumpkinAddress.random();
    const newSpendingPublicKey2 = GrumpkinAddress.random();
    const accountProof = generateAccountProof({ newSpendingPublicKey1, newSpendingPublicKey2 });
    const block = createRollupBlock([accountProof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    db.getAccountTx.mockResolvedValue({
      settled: undefined,
    });

    await accountState.processBlocks([createBlockContext(block)]);

    const txId = new TxId(accountProof.proofData.txId);

    expect(db.addSpendingKey).toHaveBeenCalledTimes(2);
    expect(db.addSpendingKey.mock.calls[0][0]).toEqual({
      accountPublicKey: account.publicKey,
      key: newSpendingPublicKey1.x(),
      treeIndex: 0,
      hashPath: generatedHashPaths[0].toBuffer(),
    });
    expect(db.addSpendingKey.mock.calls[1][0]).toEqual({
      accountPublicKey: account.publicKey,
      key: newSpendingPublicKey2.x(),
      treeIndex: 1,
      hashPath: generatedHashPaths[1].toBuffer(),
    });
    expect(db.addAccountTx).toHaveBeenCalledTimes(1);
    expect(db.addAccountTx).toHaveBeenCalledWith(
      expect.objectContaining({
        txId,
        settled: block.mined,
      }),
    );
  });

  it('should recover an account creation tx and add spending keys for user', async () => {
    const aliasHash = AliasHash.random();
    const newSpendingPublicKey1 = GrumpkinAddress.random();
    const newSpendingPublicKey2 = GrumpkinAddress.random();
    const accountProof = generateAccountProof({ aliasHash, newSpendingPublicKey1, newSpendingPublicKey2 });
    const block = createRollupBlock([accountProof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    const txId = new TxId(accountProof.proofData.txId);

    expect(db.addSpendingKey).toHaveBeenCalledTimes(2);
    expect(db.addSpendingKey.mock.calls[0][0]).toEqual({
      accountPublicKey: account.publicKey,
      key: newSpendingPublicKey1.x(),
      treeIndex: 0,
      hashPath: generatedHashPaths[0].toBuffer(),
    });
    expect(db.addSpendingKey.mock.calls[1][0]).toEqual({
      accountPublicKey: account.publicKey,
      key: newSpendingPublicKey2.x(),
      treeIndex: 1,
      hashPath: generatedHashPaths[1].toBuffer(),
    });
    expect(db.addAccountTx).toHaveBeenCalledTimes(1);
    expect(db.addAccountTx.mock.calls[0][0]).toMatchObject({
      txId,
      accountPublicKey: account.publicKey,
      aliasHash,
      newSpendingPublicKey1: newSpendingPublicKey1.x(),
      newSpendingPublicKey2: newSpendingPublicKey2.x(),
      migrated: false,
      settled: block.mined,
    });
  });

  it('should ignore an account migration tx created by current user', async () => {
    const newUser = createAccount();
    const aliasHash = AliasHash.random();
    const newSpendingPublicKey1 = GrumpkinAddress.random();
    const newSpendingPublicKey2 = GrumpkinAddress.random();
    const accountProof = generateAccountProof({
      aliasHash,
      newAccountPublicKey: newUser.publicKey,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
    });
    const block = createRollupBlock([accountProof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addSpendingKey).toHaveBeenCalledTimes(0);
    expect(db.addAccountTx).toHaveBeenCalledTimes(0);
  });

  it('should recover an account migration tx and add spending keys for the new user', async () => {
    const oldUser = createAccount();
    const aliasHash = AliasHash.random();
    const newSpendingPublicKey1 = GrumpkinAddress.random();
    const newSpendingPublicKey2 = GrumpkinAddress.random();
    const accountProof = generateAccountProof({
      accountPublicKey: oldUser.publicKey,
      aliasHash,
      newAccountPublicKey: account.publicKey,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
    });
    const block = createRollupBlock([accountProof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    const txId = new TxId(accountProof.proofData.txId);

    expect(db.addSpendingKey).toHaveBeenCalledTimes(2);
    expect(db.addSpendingKey.mock.calls[0][0]).toEqual({
      accountPublicKey: account.publicKey,
      key: newSpendingPublicKey1.x(),
      treeIndex: 0,
      hashPath: generatedHashPaths[0].toBuffer(),
    });
    expect(db.addSpendingKey.mock.calls[1][0]).toEqual({
      accountPublicKey: account.publicKey,
      key: newSpendingPublicKey2.x(),
      treeIndex: 1,
      hashPath: generatedHashPaths[1].toBuffer(),
    });
    expect(db.addAccountTx).toHaveBeenCalledTimes(1);
    expect(db.addAccountTx.mock.calls[0][0]).toMatchObject({
      txId,
      accountPublicKey: account.publicKey,
      aliasHash,
      newSpendingPublicKey1: newSpendingPublicKey1.x(),
      newSpendingPublicKey2: newSpendingPublicKey2.x(),
      migrated: true,
      settled: block.mined,
    });
  });

  it('should ignore account proof that is not us', async () => {
    const randomUser = createAccount();
    const accountProof = generateAccountProof({ accountPublicKey: randomUser.publicKey });
    const block = createRollupBlock([accountProof]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addSpendingKey).toHaveBeenCalledTimes(0);
    expect(db.addAccountTx).toHaveBeenCalledTimes(0);
  });

  it('update a defi tx, add claim to db and nullify old notes', async () => {
    const outputNoteValue = 36n;
    const bridgeCallData = BridgeCallData.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const outputValueA = depositValue / 5n;
    const outputValueB = totalOutputValueB / 5n;
    const result = true;

    const defiProof = generateDefiDepositProof({ bridgeCallData, outputNoteValue, depositValue });
    const defiProofInteractionNonce = 0;
    const interactionResult = [
      new DefiInteractionEvent(
        bridgeCallData,
        defiProofInteractionNonce,
        totalInputValue,
        totalOutputValueA,
        totalOutputValueB,
        result,
      ),
      new DefiInteractionEvent(BridgeCallData.random(), defiProofInteractionNonce + 1, 12n, 34n, 56n, result),
    ];
    const block = createRollupBlock([defiProof], {
      interactionResult,
      bridgeCallDatas: interactionResult.map(ir => ir.bridgeCallData),
      dataStartIndex: 256,
    });
    const txId = new TxId(defiProof.proofData.txId);

    db.getDefiTxsByNonce.mockResolvedValue([]).mockResolvedValueOnce([{ txId, depositValue: depositValue }]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    const { partialStateSecretEphPubKey } = defiProof.offchainTxData;
    const partialStateSecret = deriveNoteSecret(partialStateSecretEphPubKey, account.privateKey, grumpkin);

    expect(db.addClaimTx).toHaveBeenCalledTimes(1);
    expect(db.addClaimTx.mock.calls[0][0]).toMatchObject({
      defiTxId: txId,
      accountPublicKey: account.publicKey,
      secret: partialStateSecret,
    });
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: defiProof.proofData.noteCommitment2,
      value: outputNoteValue,
      hashPath: generatedHashPaths[257].toBuffer(),
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier2);
    expect(db.addDefiTx).toHaveBeenCalledTimes(2);
    expect(db.addDefiTx).toHaveBeenLastCalledWith(
      expect.objectContaining({
        txId,
        interactionNonce: defiProofInteractionNonce,
        success: true,
        outputValueA,
        outputValueB,
        settled: block.mined,
        finalised: block.mined,
      }),
    );
  });

  it('update a defi tx, add claim to db and nullify old notes - async defi', async () => {
    const outputNoteValue = 36n;
    const bridgeCallData = BridgeCallData.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const outputValueA = depositValue / 5n;
    const outputValueB = totalOutputValueB / 5n;
    const result = true;

    const defiProof = generateDefiDepositProof({ bridgeCallData, outputNoteValue, depositValue });
    const defiProofInteractionNonce = 0;

    // first rollup doesn't have defi result
    const block1 = createRollupBlock([defiProof], {
      bridgeCallDatas: [bridgeCallData, BridgeCallData.random(), BridgeCallData.random()],
      interactionResult: [
        new DefiInteractionEvent(BridgeCallData.random(), defiProofInteractionNonce + 1, 12n, 34n, 56n, result),
      ],
      dataStartIndex: 256,
    });
    const txId = new TxId(defiProof.proofData.txId);

    db.getDefiTx.mockResolvedValue(defiProof.tx);

    // create some other transaction to put into a rollup
    // the defi interaction result will go in this block
    const jsProof = generateTransferProof();
    const block2 = createRollupBlock([jsProof], {
      rollupId: 1,
      interactionResult: [
        new DefiInteractionEvent(
          bridgeCallData,
          defiProofInteractionNonce,
          totalInputValue,
          totalOutputValueA,
          totalOutputValueB,
          result,
        ),
      ],
      dataStartIndex: 258,
    });

    db.getDefiTxsByNonce.mockImplementation((_, nonce: number) =>
      nonce === defiProofInteractionNonce ? [defiProof.tx] : [],
    );
    rollupProvider.getBlocks.mockResolvedValue([block1, block2]);

    await accountState.processBlocks([createBlockContext(block1), createBlockContext(block2)]);

    const { partialStateSecretEphPubKey } = defiProof.offchainTxData;
    const partialStateSecret = deriveNoteSecret(partialStateSecretEphPubKey, account.privateKey, grumpkin);

    //claim should dhave been created
    expect(db.addClaimTx).toHaveBeenCalledTimes(1);
    expect(db.addClaimTx.mock.calls[0][0]).toMatchObject({
      defiTxId: txId,
      secret: partialStateSecret,
      accountPublicKey: account.publicKey,
    });

    // defi inputs should have been nullified
    expect(db.nullifyNote).toHaveBeenCalledTimes(4);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier2);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(jsProof.proofData.nullifier2);

    // defi tx should have been given nonce
    expect(db.addDefiTx).toHaveBeenCalledTimes(2);
    expect(db.addDefiTx.mock.calls[0][0]).toMatchObject({
      txId: defiProof.tx.txId,
      interactionNonce: defiProofInteractionNonce,
      isAsync: true,
      settled: block1.mined,
    });
    expect(db.addDefiTx.mock.calls[1][0]).toMatchObject({
      ...db.addDefiTx.mock.calls[0][0],
      success: true,
      outputValueA,
      outputValueB,
      finalised: block2.mined,
    });

    // claim output should have been created
    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: defiProof.proofData.noteCommitment2,
      value: outputNoteValue,
      hashPath: generatedHashPaths[257].toBuffer(),
    });
  });

  it('restore a defi tx and save to db, nullify input notes', async () => {
    const inputNoteValues = [70n, 30n];
    const outputNoteValue = 20n;
    const bridgeCallData = BridgeCallData.random();
    const depositValue = 64n;
    const totalInputValue = depositValue * 5n;
    const totalOutputValueA = depositValue;
    const totalOutputValueB = depositValue * 10n;
    const result = true;
    const txFee = inputNoteValues[0] + inputNoteValues[1] - outputNoteValue - depositValue;

    const defiProof = generateDefiDepositProof({ bridgeCallData, outputNoteValue, depositValue, txFee });
    const defiProofInteractionNonce = 0;
    const interactionResult = [
      new DefiInteractionEvent(
        bridgeCallData,
        defiProofInteractionNonce - 1,
        totalInputValue,
        totalOutputValueA,
        totalOutputValueB,
        result,
      ),
      new DefiInteractionEvent(BridgeCallData.random(), defiProofInteractionNonce + 1, 12n, 34n, 56n, result),
    ];
    const block = createRollupBlock([defiProof], {
      interactionResult,
      bridgeCallDatas: [bridgeCallData],
      dataStartIndex: 64,
    });

    db.getDefiTxsByNonce.mockImplementation((_, nonce) =>
      nonce === defiProofInteractionNonce ? [] : [{ txId: TxId.random(), depositValue: 1000n }],
    );
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    const txId = new TxId(defiProof.proofData.txId);
    expect(db.addClaimTx.mock.calls[0][0]).toMatchObject({
      defiTxId: txId,
      accountPublicKey: account.publicKey,
    });
    expect(db.addNote).toHaveBeenCalledTimes(1);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: defiProof.proofData.noteCommitment2,
      value: outputNoteValue,
      hashPath: generatedHashPaths[65].toBuffer(),
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(2);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier1);
    expect(db.nullifyNote).toHaveBeenCalledWith(defiProof.proofData.nullifier2);
    expect(db.addDefiTx).toHaveBeenCalledTimes(1);
    expect(db.addDefiTx).toHaveBeenCalledWith(
      expect.objectContaining({
        txId,
        accountPublicKey: account.publicKey,
        bridgeCallData,
        depositValue,
        txFee,
        settled: block.mined,
        interactionNonce: defiProofInteractionNonce,
        isAsync: true,
        success: undefined,
        outputValueA: undefined,
        outputValueB: undefined,
      }),
    );
  });

  it('add defi proof and its linked j/s proof, update the note status after the tx is settled', async () => {
    const outputNoteValue1 = 36n;
    const outputNoteValue2 = 64n;
    const defiTxFee = 6n;
    const depositValue = outputNoteValue1 - defiTxFee;
    const outputValueA = 10n;
    const outputValueB = 20n;
    const bridgeCallData = BridgeCallData.random();
    const defiResult = true;

    const jsProof = generatePaymentProof({ newNoteOwner: account, outputNoteValue1, outputNoteValue2 });
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

    const defiProof = generateDefiDepositProof({ bridgeCallData, depositValue });
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

    await accountState.addProof(defiProofOutput);
    expect(db.addNote).toHaveBeenCalledTimes(0);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(0);
    expect(db.addDefiTx).toHaveBeenCalledTimes(1);
    expect(db.addDefiTx).toHaveBeenCalledWith(defiProof.tx);

    db.addNote.mockClear();
    db.addDefiTx.mockClear();

    db.getDefiTx.mockResolvedValue(defiProof.tx);

    const defiProofInteractionNonce = 0;
    const interactionResult = [
      new DefiInteractionEvent(
        bridgeCallData,
        defiProofInteractionNonce,
        depositValue,
        outputValueA,
        outputValueB,
        defiResult,
      ),
    ];
    const block = createRollupBlock([jsProof, defiProof], {
      interactionResult,
      bridgeCallDatas: [bridgeCallData],
      dataStartIndex: 92,
    });
    db.getDefiTxsByNonce
      .mockResolvedValue([])
      .mockResolvedValueOnce([{ txId: defiProof.tx.txId, depositValue: depositValue }]);
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment1,
      value: outputNoteValue1,
      allowChain: false,
      pending: false,
      hashPath: generatedHashPaths[92].toBuffer(),
    });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({
      commitment: jsProof.proofData.noteCommitment2,
      value: outputNoteValue2,
      allowChain: false,
      pending: false,
      hashPath: generatedHashPaths[93].toBuffer(),
    });
    expect(db.addPaymentTx).toHaveBeenCalledTimes(1);

    expect(db.addDefiTx).toHaveBeenCalledTimes(2);
    expect(db.addDefiTx.mock.calls[0][0]).toMatchObject({
      txId: defiProof.tx.txId,
      interactionNonce: defiProofInteractionNonce,
      settled: block.mined,
    });
    expect(db.addDefiTx.mock.calls[1][0]).toMatchObject({
      txId: defiProof.tx.txId,
      interactionNonce: defiProofInteractionNonce,
      success: true,
      outputValueA,
      outputValueB,
      settled: block.mined,
      finalised: block.mined,
    });
  });

  it('process chained txs in a single block', async () => {
    const proof1 = generateTransferProof();
    const outputNote = proof1.outputNotes[1];
    const proof2 = generatePaymentProof({
      inputNoteValue1: outputNote.value,
      inputNoteNullifier1: outputNote.nullifier,
      outputNoteValue2: 5n,
    });
    const block = createRollupBlock([proof1, proof2]);

    // There are only 2 notes saved in the db initially.
    // Input note for proof2 is the output note of proof1.
    inputNotes = proof1.inputNotes;
    db.getPaymentTx.mockImplementation((accountPublicKey, txId) =>
      [proof1.tx, proof2.tx].find(tx => tx.accountPublicKey.equals(accountPublicKey) && tx.txId.equals(txId)),
    );
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addNote).toHaveBeenCalledTimes(2);
    expect(db.addNote.mock.calls[0][0]).toMatchObject({
      commitment: proof1.proofData.noteCommitment2,
      value: proof1.tx.senderPrivateOutput,
    });
    expect(db.addNote.mock.calls[1][0]).toMatchObject({
      commitment: proof2.proofData.noteCommitment2,
      value: proof2.tx.senderPrivateOutput,
    });
    expect(db.nullifyNote).toHaveBeenCalledTimes(3);
    expect(db.nullifyNote).toHaveBeenCalledWith(proof1.inputNotes[0].nullifier);
    expect(db.nullifyNote).toHaveBeenCalledWith(proof1.inputNotes[1].nullifier);
    expect(db.nullifyNote).toHaveBeenCalledWith(outputNote.nullifier);
    expect(db.addPaymentTx).toHaveBeenCalledTimes(2);
    expect(db.addPaymentTx).toHaveBeenCalledWith({
      ...proof1.tx,
      settled: block.mined,
    });
    expect(db.addPaymentTx).toHaveBeenCalledWith({
      ...proof2.tx,
      settled: block.mined,
    });
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
    rollupProvider.getBlocks.mockResolvedValue([block]);

    await accountState.processBlocks([createBlockContext(block)]);

    expect(db.addNote).toHaveBeenCalledTimes(0);
  });

  it('remove orphaned txs and notes', async () => {
    const unsettledTxs = [...Array(4)].map(() => TxId.random());
    db.getPendingTxs.mockResolvedValue(unsettledTxs);

    const pendingNotes = [...Array(6)].map(() => ({ commitment: randomBytes(32), nullifier: randomBytes(32) }));
    db.getPendingNotes.mockResolvedValue(pendingNotes);

    const pendingTxs = [
      { txId: TxId.random(), noteCommitment1: pendingNotes[1].commitment, noteCommitment2: randomBytes(32) },
      { txId: unsettledTxs[1], noteCommitment1: randomBytes(32), noteCommitment2: pendingNotes[2].commitment },
      { txId: TxId.random(), noteCommitment1: randomBytes(32), noteCommitment2: randomBytes(32) },
      {
        txId: unsettledTxs[3],
        noteCommitment1: pendingNotes[4].commitment,
        noteCommitment2: pendingNotes[5].commitment,
      },
    ];
    rollupProvider.getPendingTxs.mockResolvedValue(pendingTxs);

    accountState = new AccountState(aztecWalletProvider, blockProcessor, rollupProvider as any, db as any);
    await accountState.init();

    expect(db.removeTx).toHaveBeenCalledTimes(2);
    expect(db.removeTx).toHaveBeenCalledWith(account.publicKey, unsettledTxs[0]);
    expect(db.removeTx).toHaveBeenCalledWith(account.publicKey, unsettledTxs[2]);
    expect(db.removeNote).toHaveBeenCalledTimes(2);
    expect(db.removeNote).toHaveBeenCalledWith(pendingNotes[0].nullifier);
    expect(db.removeNote).toHaveBeenCalledWith(pendingNotes[3].nullifier);
  });

  describe('defi claim proof', () => {
    it('settle a defi tx and add new notes', async () => {
      const outputAssetIdA = 3;
      const outputAssetIdB = 4;
      const bridgeCallData = new BridgeCallData(0, 1, outputAssetIdA, 2, outputAssetIdB);
      const depositValue = 12n;
      const outputValueA = 34n;
      const outputValueB = 56n;
      const txId = TxId.random();
      const secret = randomBytes(32);
      const accountRequired = true;
      const partialState = noteAlgos.valueNotePartialCommitment(secret, account.publicKey, accountRequired);
      const nullifier1 = randomBytes(32);
      const nullifier2 = randomBytes(32);
      const success = true;

      const claimProof = generateDefiClaimProof({
        bridgeCallData,
        outputValueA,
        outputValueB,
        nullifier1,
        nullifier2,
      });
      const block = createRollupBlock([claimProof]);

      db.getClaimTx.mockImplementation(() => ({
        defiTxId: txId,
        accountPublicKey: account.publicKey,
        partialState,
        secret,
      }));
      db.getDefiTx.mockImplementation(() => ({
        proofId: ProofId.DEFI_DEPOSIT,
        txId,
        accountPublicKey: account.publicKey,
        bridgeCallData,
        depositValue,
        outputValueA,
        outputValueB,
        success,
      }));
      rollupProvider.getBlocks.mockResolvedValue([block]);

      await accountState.processBlocks([createBlockContext(block)]);

      expect(db.addNote).toHaveBeenCalledTimes(2);
      expect(db.addNote.mock.calls[0][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment1,
        treeNote: expect.objectContaining({
          assetId: outputAssetIdA,
          value: outputValueA,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addNote.mock.calls[1][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment2,
        treeNote: expect.objectContaining({
          assetId: outputAssetIdB,
          value: outputValueB,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addDefiTx).toHaveBeenCalledTimes(1);
      expect(db.addDefiTx).toHaveBeenCalledWith(
        expect.objectContaining({
          txId,
          claimSettled: block.mined,
          claimTxId: new TxId(claimProof.proofData.txId),
        }),
      );
    });

    it('settle a defi tx and add new notes for unregistered account', async () => {
      const outputAssetIdA = 3;
      const outputAssetIdB = 4;
      const bridgeCallData = new BridgeCallData(0, 1, outputAssetIdA, 2, outputAssetIdB);
      const depositValue = 12n;
      const outputValueA = 34n;
      const outputValueB = 56n;
      const txId = TxId.random();
      const secret = randomBytes(32);
      const accountRequired = false; // <--
      const partialState = noteAlgos.valueNotePartialCommitment(secret, account.publicKey, accountRequired);
      const nullifier1 = randomBytes(32);
      const nullifier2 = randomBytes(32);
      const success = true;

      const claimProof = generateDefiClaimProof({
        accountRequired,
        bridgeCallData,
        outputValueA,
        outputValueB,
        nullifier1,
        nullifier2,
      });
      const block = createRollupBlock([claimProof]);

      db.getClaimTx.mockImplementation(() => ({
        defiTxId: txId,
        accountPublicKey: account.publicKey,
        partialState,
        secret,
      }));
      db.getDefiTx.mockImplementation(() => ({
        proofId: ProofId.DEFI_DEPOSIT,
        txId,
        accountPublicKey: account.publicKey,
        bridgeCallData,
        depositValue,
        outputValueA,
        outputValueB,
        success,
      }));
      rollupProvider.getBlocks.mockResolvedValue([block]);

      await accountState.processBlocks([createBlockContext(block)]);

      expect(db.addNote).toHaveBeenCalledTimes(2);
      expect(db.addNote.mock.calls[0][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment1,
        treeNote: expect.objectContaining({
          assetId: outputAssetIdA,
          value: outputValueA,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addNote.mock.calls[1][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment2,
        treeNote: expect.objectContaining({
          assetId: outputAssetIdB,
          value: outputValueB,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addDefiTx).toHaveBeenCalledTimes(1);
      expect(db.addDefiTx).toHaveBeenCalledWith(
        expect.objectContaining({
          txId,
          claimSettled: block.mined,
          claimTxId: new TxId(claimProof.proofData.txId),
        }),
      );
    });

    it('settle a defi tx and add one virtual output note', async () => {
      const outputAssetIdA = virtualAssetIdPlaceholder;
      const bridgeCallData = new BridgeCallData(0, 1, outputAssetIdA);
      const depositValue = 12n;
      const outputValueA = 34n;
      const outputValueB = 0n;
      const txId = TxId.random();
      const secret = randomBytes(32);
      const accountRequired = true;
      const partialState = noteAlgos.valueNotePartialCommitment(secret, account.publicKey, accountRequired);
      const nullifier1 = randomBytes(32);
      const nullifier2 = randomBytes(32);
      const success = true;
      const interactionNonce = 789;

      db.getClaimTx.mockImplementation(() => ({
        defiTxId: txId,
        accountPublicKey: account.publicKey,
        partialState,
        secret,
        interactionNonce,
      }));
      db.getDefiTx.mockImplementation(() => ({
        proofId: ProofId.DEFI_DEPOSIT,
        txId,
        accountPublicKey: account.publicKey,
        bridgeCallData,
        depositValue,
        outputValueA,
        outputValueB,
        success,
      }));

      const claimProof = generateDefiClaimProof({
        bridgeCallData,
        outputValueA,
        outputValueB,
        nullifier1,
        nullifier2,
      });
      const block = createRollupBlock([claimProof]);
      rollupProvider.getBlocks.mockResolvedValue([block]);

      await accountState.processBlocks([createBlockContext(block)]);

      expect(db.addNote).toHaveBeenCalledTimes(1);
      expect(db.addNote.mock.calls[0][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment1,
        treeNote: expect.objectContaining({
          assetId: virtualAssetIdFlag + interactionNonce,
          value: outputValueA,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addDefiTx).toHaveBeenCalledTimes(1);
      expect(db.addDefiTx).toHaveBeenCalledWith(
        expect.objectContaining({
          txId,
          claimSettled: block.mined,
          claimTxId: new TxId(claimProof.proofData.txId),
        }),
      );
    });

    it('settle a defi tx and add one real and one virtual output notes', async () => {
      const outputAssetIdA = 3;
      const outputAssetIdB = virtualAssetIdPlaceholder;
      const bridgeCallData = new BridgeCallData(0, 1, outputAssetIdA, 2, outputAssetIdB);
      const depositValue = 12n;
      const outputValueA = 34n;
      const outputValueB = 56n;
      const txId = TxId.random();
      const secret = randomBytes(32);
      const accountRequired = true;
      const partialState = noteAlgos.valueNotePartialCommitment(secret, account.publicKey, accountRequired);
      const nullifier1 = randomBytes(32);
      const nullifier2 = randomBytes(32);
      const success = true;
      const interactionNonce = 789;

      db.getClaimTx.mockImplementation(() => ({
        defiTxId: txId,
        accountPublicKey: account.publicKey,
        partialState,
        secret,
        interactionNonce,
      }));
      db.getDefiTx.mockImplementation(() => ({
        proofId: ProofId.DEFI_DEPOSIT,
        txId,
        accountPublicKey: account.publicKey,
        bridgeCallData,
        depositValue,
        outputValueA,
        outputValueB,
        success,
      }));

      const claimProof = generateDefiClaimProof({
        bridgeCallData,
        outputValueA,
        outputValueB,
        nullifier1,
        nullifier2,
      });
      const block = createRollupBlock([claimProof]);
      rollupProvider.getBlocks.mockResolvedValue([block]);

      await accountState.processBlocks([createBlockContext(block)]);

      expect(db.addNote).toHaveBeenCalledTimes(2);
      expect(db.addNote.mock.calls[0][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment1,
        treeNote: expect.objectContaining({
          assetId: outputAssetIdA,
          value: outputValueA,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addNote.mock.calls[1][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment2,
        treeNote: expect.objectContaining({
          assetId: virtualAssetIdFlag + interactionNonce,
          value: outputValueB,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addDefiTx).toHaveBeenCalledTimes(1);
      expect(db.addDefiTx).toHaveBeenCalledWith(
        expect.objectContaining({
          txId,
          claimSettled: block.mined,
          claimTxId: new TxId(claimProof.proofData.txId),
        }),
      );
    });

    it('settle a failed defi tx and add a refund note', async () => {
      const inputAssetIdA = 1;
      const bridgeCallData = new BridgeCallData(0, inputAssetIdA, 2);
      const depositValue = 12n;
      const outputValueA = 0n;
      const outputValueB = 0n;
      const txId = TxId.random();
      const secret = randomBytes(32);
      const accountRequired = true;
      const partialState = noteAlgos.valueNotePartialCommitment(secret, account.publicKey, accountRequired);
      const nullifier1 = randomBytes(32);
      const nullifier2 = randomBytes(32);
      const result = false;

      db.getClaimTx.mockImplementation(() => ({
        defiTxId: txId,
        accountPublicKey: account.publicKey,
        partialState,
        secret,
      }));
      db.getDefiTx.mockImplementation(() => ({
        proofId: ProofId.DEFI_DEPOSIT,
        txId,
        accountPublicKey: account.publicKey,
        bridgeCallData,
        depositValue,
        outputValueA,
        outputValueB,
        result,
      }));

      const claimProof = generateDefiClaimProof({
        bridgeCallData,
        outputValueA,
        outputValueB,
        nullifier1,
        nullifier2,
      });
      const block = createRollupBlock([claimProof]);
      rollupProvider.getBlocks.mockResolvedValue([block]);

      await accountState.processBlocks([createBlockContext(block)]);

      expect(db.addNote).toHaveBeenCalledTimes(1);
      expect(db.addNote.mock.calls[0][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment1,
        treeNote: expect.objectContaining({
          assetId: inputAssetIdA,
          value: depositValue,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addDefiTx).toHaveBeenCalledTimes(1);
      expect(db.addDefiTx).toHaveBeenCalledWith(
        expect.objectContaining({
          txId,
          claimSettled: block.mined,
          claimTxId: new TxId(claimProof.proofData.txId),
        }),
      );
    });

    it('settle a failed defi tx and add a refund note for unregistered account', async () => {
      const inputAssetIdA = 1;
      const bridgeCallData = new BridgeCallData(0, inputAssetIdA, 2);
      const depositValue = 12n;
      const outputValueA = 0n;
      const outputValueB = 0n;
      const txId = TxId.random();
      const secret = randomBytes(32);
      const accountRequired = false; // <--
      const partialState = noteAlgos.valueNotePartialCommitment(secret, account.publicKey, accountRequired);
      const nullifier1 = randomBytes(32);
      const nullifier2 = randomBytes(32);
      const result = false;

      db.getClaimTx.mockImplementation(() => ({
        defiTxId: txId,
        accountPublicKey: account.publicKey,
        partialState,
        secret,
      }));
      db.getDefiTx.mockImplementation(() => ({
        proofId: ProofId.DEFI_DEPOSIT,
        txId,
        accountPublicKey: account.publicKey,
        bridgeCallData,
        depositValue,
        outputValueA,
        outputValueB,
        result,
      }));

      const claimProof = generateDefiClaimProof({
        accountRequired,
        bridgeCallData,
        outputValueA,
        outputValueB,
        nullifier1,
        nullifier2,
      });
      const block = createRollupBlock([claimProof]);
      rollupProvider.getBlocks.mockResolvedValue([block]);

      await accountState.processBlocks([createBlockContext(block)]);

      expect(db.addNote).toHaveBeenCalledTimes(1);
      expect(db.addNote.mock.calls[0][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment1,
        treeNote: expect.objectContaining({
          assetId: inputAssetIdA,
          value: depositValue,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addDefiTx).toHaveBeenCalledTimes(1);
      expect(db.addDefiTx).toHaveBeenCalledWith(
        expect.objectContaining({
          txId,
          claimSettled: block.mined,
          claimTxId: new TxId(claimProof.proofData.txId),
        }),
      );
    });

    it('settle a failed defi tx and add two refund notes', async () => {
      const inputAssetIdA = 1;
      const inputAssetIdB = 2;
      const bridgeCallData = new BridgeCallData(0, inputAssetIdA, 0, inputAssetIdB);
      const depositValue = 12n;
      const outputValueA = 0n;
      const outputValueB = 0n;
      const txId = TxId.random();
      const secret = randomBytes(32);
      const accountRequired = true;
      const partialState = noteAlgos.valueNotePartialCommitment(secret, account.publicKey, accountRequired);
      const nullifier1 = randomBytes(32);
      const nullifier2 = randomBytes(32);
      const result = false;

      db.getClaimTx.mockImplementation(() => ({
        defiTxId: txId,
        accountPublicKey: account.publicKey,
        partialState,
        secret,
      }));
      db.getDefiTx.mockImplementation(() => ({
        proofId: ProofId.DEFI_DEPOSIT,
        txId,
        accountPublicKey: account.publicKey,
        bridgeCallData,
        depositValue,
        outputValueA,
        outputValueB,
        result,
      }));

      const claimProof = generateDefiClaimProof({
        bridgeCallData,
        outputValueA,
        outputValueB,
        nullifier1,
        nullifier2,
      });
      const block = createRollupBlock([claimProof]);
      rollupProvider.getBlocks.mockResolvedValue([block]);

      await accountState.processBlocks([createBlockContext(block)]);

      expect(db.addNote).toHaveBeenCalledTimes(2);
      expect(db.addNote.mock.calls[0][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment1,
        treeNote: expect.objectContaining({
          assetId: inputAssetIdA,
          value: depositValue,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addNote.mock.calls[1][0]).toMatchObject({
        commitment: claimProof.proofData.noteCommitment2,
        treeNote: expect.objectContaining({
          assetId: inputAssetIdB,
          value: depositValue,
          noteSecret: secret,
          accountRequired,
        }),
      });
      expect(db.addDefiTx).toHaveBeenCalledTimes(1);
      expect(db.addDefiTx).toHaveBeenCalledWith(
        expect.objectContaining({
          txId,
          claimSettled: block.mined,
          claimTxId: new TxId(claimProof.proofData.txId),
        }),
      );
    });
  });
});
