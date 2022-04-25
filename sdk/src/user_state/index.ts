import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { Block } from '@aztec/barretenberg/block_source';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { createLogger } from '@aztec/barretenberg/debug';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import {
  batchDecryptNotes,
  DefiInteractionNote,
  deriveNoteSecret,
  NoteAlgorithms,
  recoverTreeNotes,
  TreeNote,
} from '@aztec/barretenberg/note_algorithms';
import {
  OffchainAccountData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { EventEmitter } from 'events';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, PaymentProofId } from '../core_tx';
import { Database } from '../database';
import { Note } from '../note';
import { NotePicker } from '../note_picker';
import { ProofOutput } from '../proofs';
import { UserData } from '../user';
import { DefiInteractionEvent } from '@aztec/barretenberg/block_source/defi_interaction_event';

const debug = createLogger('bb:user_state');

export enum UserStateEvent {
  UPDATED_USER_STATE = 'UPDATED_USER_STATE',
}

enum SyncState {
  OFF,
  SYNCHING,
  MONITORING,
}

export class UserState extends EventEmitter {
  private notePickers: { assetId: number; notePicker: NotePicker }[] = [];
  private blockQueue = new MemoryFifo<Block>();
  private syncState = SyncState.OFF;
  private syncingPromise!: Promise<void>;

  constructor(
    private user: UserData,
    private grumpkin: Grumpkin,
    private noteAlgos: NoteAlgorithms,
    private db: Database,
    private rollupProvider: RollupProvider,
  ) {
    super();
  }

  private debug(...args: any[]) {
    debug(`${this.user.id.toShortString()}:`, ...args);
  }

  /**
   * Load/refresh user state.
   */
  public async init() {
    await this.resetData();
    await this.refreshNotePicker();
  }

  /**
   * First handles all historical blocks.
   * Then starts processing blocks added to queue via `processBlock()`.
   * Blocks may already be being added to the queue before we start synching. This means we may try to
   * process the same block twice, but will never miss a block. The block handler will filter duplicates.
   */
  public async startSync() {
    if (this.syncState !== SyncState.OFF) {
      return;
    }
    const start = new Date().getTime();
    this.debug(`starting sync from rollup block ${this.user.syncedToRollup + 1}...`);
    this.syncState = SyncState.SYNCHING;
    const blocks = await this.rollupProvider.getBlocks(this.user.syncedToRollup + 1);
    await this.handleBlocks(blocks);
    this.debug(`sync complete in ${new Date().getTime() - start}ms.`);
    this.syncingPromise = this.blockQueue.process(async block => this.handleBlocks([block]));
    this.syncState = SyncState.MONITORING;
  }

  /**
   * Stops processing queued blocks. Blocks until any processing is complete.
   */
  public stopSync(flush = false) {
    if (this.syncState === SyncState.OFF) {
      return;
    }
    this.debug(`stopping sync.`);
    flush ? this.blockQueue.end() : this.blockQueue.cancel();
    this.syncState = SyncState.OFF;
    return this.syncingPromise;
  }

  public isSyncing() {
    return this.syncState === SyncState.SYNCHING;
  }

  public async awaitSynchronised() {
    while (this.syncState === SyncState.SYNCHING) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public getUser() {
    return this.user;
  }

  public processBlock(block: Block) {
    this.blockQueue.put(block);
  }

  public async handleBlocks(blocks: Block[]) {
    blocks = blocks.filter(b => b.rollupId > this.user.syncedToRollup);
    if (blocks.length == 0) {
      return;
    }

    const rollupProofData = blocks.map(b => RollupProofData.fromBuffer(b.rollupProofData));
    const innerProofs = rollupProofData.map(p => p.innerProofData.filter(i => !i.isPadding())).flat();
    const offchainTxDataBuffers = blocks.map(b => b.offchainTxData).flat();
    const viewingKeys: ViewingKey[] = [];
    const noteCommitments: Buffer[] = [];
    const inputNullifiers: Buffer[] = [];
    const offchainJoinSplitData: OffchainJoinSplitData[] = [];
    const offchainAccountData: OffchainAccountData[] = [];
    const offchainDefiDepositData: OffchainDefiDepositData[] = [];

    innerProofs.forEach((proof, i) => {
      switch (proof.proofId) {
        case ProofId.DEPOSIT:
        case ProofId.WITHDRAW:
        case ProofId.SEND: {
          const offchainTxData = OffchainJoinSplitData.fromBuffer(offchainTxDataBuffers[i]);
          viewingKeys.push(...offchainTxData.viewingKeys);
          const {
            noteCommitment1,
            noteCommitment2,
            nullifier1: inputNullifier1,
            nullifier2: inputNullifier2,
          } = innerProofs[i];
          noteCommitments.push(noteCommitment1);
          noteCommitments.push(noteCommitment2);
          inputNullifiers.push(inputNullifier1);
          inputNullifiers.push(inputNullifier2);
          offchainJoinSplitData.push(offchainTxData);
          break;
        }
        case ProofId.ACCOUNT: {
          offchainAccountData.push(OffchainAccountData.fromBuffer(offchainTxDataBuffers[i]));
          break;
        }
        case ProofId.DEFI_DEPOSIT: {
          const offchainTxData = OffchainDefiDepositData.fromBuffer(offchainTxDataBuffers[i]);
          viewingKeys.push(offchainTxData.viewingKey);
          const { noteCommitment2, nullifier2: inputNullifier2 } = innerProofs[i];
          noteCommitments.push(noteCommitment2);
          inputNullifiers.push(inputNullifier2);
          offchainDefiDepositData.push(offchainTxData);
          break;
        }
      }
    });

    const viewingKeysBuf = Buffer.concat(viewingKeys.flat().map(vk => vk.toBuffer()));
    const decryptedTreeNotes = await batchDecryptNotes(
      viewingKeysBuf,
      this.user.privateKey,
      this.noteAlgos,
      this.grumpkin,
    );
    const treeNotes = recoverTreeNotes(
      decryptedTreeNotes,
      inputNullifiers,
      noteCommitments,
      this.user.privateKey,
      this.grumpkin,
      this.noteAlgos,
    );

    let treeNoteStartIndex = 0;
    for (let blockIndex = 0; blockIndex < blocks.length; ++blockIndex) {
      const block = blocks[blockIndex];
      const proofData = rollupProofData[blockIndex];

      for (let i = 0; i < proofData.innerProofData.length; ++i) {
        const proof = proofData.innerProofData[i];
        if (proof.isPadding()) {
          continue;
        }

        const noteStartIndex = proofData.dataStartIndex + i * 2;
        switch (proof.proofId) {
          case ProofId.DEPOSIT:
          case ProofId.WITHDRAW:
          case ProofId.SEND: {
            const [offchainTxData] = offchainJoinSplitData.splice(0, 1);
            const [note1, note2] = treeNotes.slice(treeNoteStartIndex, treeNoteStartIndex + 2);
            treeNoteStartIndex += 2;
            if (!note1 && !note2) {
              continue;
            }
            await this.handlePaymentTx(proof, offchainTxData, noteStartIndex, block.created, note1, note2);
            break;
          }
          case ProofId.ACCOUNT: {
            const [offchainTxData] = offchainAccountData.splice(0, 1);
            await this.handleAccountTx(proof, offchainTxData, noteStartIndex, block.created);
            break;
          }
          case ProofId.DEFI_DEPOSIT: {
            const note2 = treeNotes[treeNoteStartIndex];
            treeNoteStartIndex++;
            const [offchainTxData] = offchainDefiDepositData.splice(0, 1);
            if (!note2) {
              // Both notes should be owned by the same user.
              continue;
            }
            await this.handleDefiDepositTx(
              proofData,
              proof,
              offchainTxData,
              block.created,
              noteStartIndex,
              note2,
              block.interactionResult,
            );
            break;
          }
          case ProofId.DEFI_CLAIM:
            await this.handleDefiClaimTx(proof, noteStartIndex, block.created);
            break;
        }
      }

      this.user = { ...this.user, syncedToRollup: proofData.rollupId };

      await this.processDefiInteractionResults(block.interactionResult, block.created);
    }

    await this.db.updateUser(this.user);

    this.emit(UserStateEvent.UPDATED_USER_STATE, this.user.id);
  }

  private async resetData() {
    const pendingTxs = await this.rollupProvider.getPendingTxs();

    const pendingUserTxIds = await this.db.getPendingUserTxs(this.user.id);
    for (const userTxId of pendingUserTxIds) {
      if (!pendingTxs.some(tx => tx.txId.equals(userTxId))) {
        await this.db.removeUserTx(userTxId, this.user.id);
      }
    }

    const pendingNotes = await this.db.getUserPendingNotes(this.user.id);
    for (const note of pendingNotes) {
      if (
        !pendingTxs.some(tx => tx.noteCommitment1.equals(note.commitment) || tx.noteCommitment2.equals(note.commitment))
      ) {
        await this.db.removeNote(note.nullifier);
      }
    }
  }

  private async handleAccountTx(
    proof: InnerProofData,
    offchainTxData: OffchainAccountData,
    noteStartIndex: number,
    blockCreated: Date,
  ) {
    const tx = this.recoverAccountTx(proof, offchainTxData, blockCreated);
    if (!tx.userId.equals(this.user.id)) {
      return;
    }

    const { txId, userId, newSigningPubKey1, newSigningPubKey2, aliasHash } = tx;

    if (newSigningPubKey1) {
      this.debug(`added signing key ${newSigningPubKey1.toString('hex')}.`);
      await this.db.addUserSigningKey({
        accountId: userId,
        key: newSigningPubKey1,
        treeIndex: noteStartIndex,
      });
    }

    if (newSigningPubKey2) {
      this.debug(`added signing key ${newSigningPubKey2.toString('hex')}.`);
      await this.db.addUserSigningKey({
        accountId: userId,
        key: newSigningPubKey2,
        treeIndex: noteStartIndex + 1,
      });
    }

    if (!this.user.aliasHash || !this.user.aliasHash.equals(aliasHash)) {
      this.debug(`updated alias hash ${aliasHash.toString()}.`);
      this.user = { ...this.user, aliasHash };
      await this.db.updateUser(this.user);
    }

    const savedTx = await this.db.getAccountTx(txId);
    if (savedTx) {
      this.debug(`settling account tx: ${txId.toString()}`);
      await this.db.settleAccountTx(txId, blockCreated);
    } else {
      this.debug(`recovered account tx: ${txId.toString()}`);
      await this.db.addAccountTx(tx);
    }
  }

  private async handlePaymentTx(
    proof: InnerProofData,
    offchainTxData: OffchainJoinSplitData,
    noteStartIndex: number,
    blockCreated: Date,
    note1?: TreeNote,
    note2?: TreeNote,
  ) {
    const { noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = proof;
    const newNote = await this.processNewNote(noteStartIndex, noteCommitment1, note1);
    const changeNote = await this.processNewNote(noteStartIndex + 1, noteCommitment2, note2);
    if (!newNote && !changeNote) {
      // Neither note was decrypted (change note should always belong to us for txs we created).
      return;
    }

    const destroyedNote1 = await this.nullifyNote(nullifier1);
    const destroyedNote2 = await this.nullifyNote(nullifier2);

    await this.refreshNotePicker();

    const txId = new TxId(proof.txId);
    const savedTx = await this.db.getPaymentTx(txId, this.user.id);
    if (savedTx) {
      this.debug(`settling payment tx: ${txId}`);
      await this.db.settlePaymentTx(txId, this.user.id, blockCreated);
    } else {
      const tx = this.recoverPaymentTx(
        proof,
        offchainTxData,
        blockCreated,
        newNote,
        changeNote,
        destroyedNote1,
        destroyedNote2,
      );
      this.debug(`received or recovered payment tx: ${txId}`);
      await this.db.addPaymentTx(tx);
    }
  }

  private async handleDefiDepositTx(
    rollupProofData: RollupProofData,
    proof: InnerProofData,
    offchainTxData: OffchainDefiDepositData,
    blockCreated: Date,
    noteStartIndex: number,
    treeNote2: TreeNote,
    defiInteractionNotes: DefiInteractionEvent[],
  ) {
    const { noteCommitment1, noteCommitment2 } = proof;
    const note2 = await this.processNewNote(noteStartIndex + 1, noteCommitment2, treeNote2);
    if (!note2) {
      // Owned by the account with a different nonce.
      return;
    }
    const { bridgeId, partialStateSecretEphPubKey } = offchainTxData;
    const partialStateSecret = deriveNoteSecret(partialStateSecretEphPubKey, this.user.privateKey, this.grumpkin);
    const txId = new TxId(proof.txId);
    await this.addClaim(noteStartIndex, txId, noteCommitment1, partialStateSecret);

    const { nullifier1, nullifier2 } = proof;
    await this.nullifyNote(nullifier1);
    await this.nullifyNote(nullifier2);

    await this.refreshNotePicker();

    const { rollupId, bridgeIds } = rollupProofData;
    const interactionNonce =
      RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK * rollupId +
      bridgeIds.findIndex(bridge => bridge.equals(bridgeId.toBuffer()));
    const isAsync = defiInteractionNotes.every(n => n.nonce !== interactionNonce);

    const savedTx = await this.db.getDefiTx(txId);
    if (savedTx) {
      this.debug(`found defi tx, awaiting claim for settlement: ${txId}`);
      await this.db.settleDefiDeposit(txId, interactionNonce, isAsync, blockCreated);
    } else {
      const tx = this.recoverDefiTx(proof, offchainTxData, blockCreated, interactionNonce, isAsync);
      this.debug(`recovered defi tx: ${txId}`);
      await this.db.addDefiTx(tx);
    }
  }

  private async processDefiInteractionResults(defiInteractionEvents: DefiInteractionEvent[], blockCreated: Date) {
    for (const event of defiInteractionEvents) {
      const defiTxs = await this.db.getDefiTxsByNonce(this.user.id, event.nonce);
      for (const tx of defiTxs) {
        const outputValueA = !event.result
          ? BigInt(0)
          : (event.totalOutputValueA * tx.depositValue) / event.totalInputValue;
        const outputValueB = !event.result
          ? BigInt(0)
          : (event.totalOutputValueB * tx.depositValue) / event.totalInputValue;
        await this.db.updateDefiTxFinalisationResult(tx.txId, event.result, outputValueA, outputValueB, blockCreated);
      }
    }
  }

  private async handleDefiClaimTx(proof: InnerProofData, noteStartIndex: number, blockCreated: Date) {
    const { nullifier1 } = proof;
    const claim = await this.db.getClaimTx(nullifier1);
    if (!claim?.userId.equals(this.user.id)) {
      return;
    }

    const { txId, userId, secret } = claim;
    const { noteCommitment1, noteCommitment2, nullifier2 } = proof;
    const { bridgeId, depositValue, outputValueA, outputValueB, success } = (await this.db.getDefiTx(txId))!;
    // When generating output notes, set creatorPubKey to 0 (it's a DeFi txn, recipient of note is same as creator of claim note)
    if (!success) {
      const treeNote = new TreeNote(
        userId.publicKey,
        depositValue,
        bridgeId.inputAssetIdA,
        userId.accountNonce,
        secret,
        Buffer.alloc(32),
        nullifier1,
      );
      await this.processNewNote(noteStartIndex, noteCommitment1, treeNote);
    }
    if (outputValueA) {
      const treeNote = new TreeNote(
        userId.publicKey,
        outputValueA,
        bridgeId.outputAssetIdA,
        userId.accountNonce,
        secret,
        Buffer.alloc(32),
        nullifier1,
      );
      await this.processNewNote(noteStartIndex, noteCommitment1, treeNote);
    }
    if (outputValueB) {
      const treeNote = new TreeNote(
        userId.publicKey,
        outputValueB,
        bridgeId.outputAssetIdB!,
        userId.accountNonce,
        secret,
        Buffer.alloc(32),
        nullifier2,
      );
      await this.processNewNote(noteStartIndex + 1, noteCommitment2, treeNote);
    }

    await this.refreshNotePicker();

    const claimTxId = new TxId(proof.txId);
    await this.db.settleDefiTx(txId, blockCreated, claimTxId);
    this.debug(`settled defi tx: ${txId}`);
  }

  private async processNewNote(
    index: number,
    commitment: Buffer,
    treeNote?: TreeNote,
    allowChain = false,
    pending = false,
  ) {
    if (!treeNote) {
      return;
    }

    const { ownerPubKey, noteSecret, value, assetId, nonce, creatorPubKey, inputNullifier } = treeNote;
    const noteOwner = new AccountId(ownerPubKey, nonce);
    if (!noteOwner.equals(this.user.id)) {
      return;
    }

    const nullifier = this.noteAlgos.valueNoteNullifier(commitment, this.user.privateKey);
    const note: Note = {
      assetId,
      value,
      commitment,
      secret: noteSecret,
      nullifier,
      nullified: false,
      owner: this.user.id,
      creatorPubKey,
      inputNullifier,
      index,
      allowChain,
      pending,
    };

    if (value) {
      await this.db.addNote(note);
      if (!pending) {
        this.debug(`successfully decrypted note at index ${index} with value ${value}.`);
      }
    }

    return note;
  }

  private async nullifyNote(nullifier: Buffer) {
    const note = await this.db.getNoteByNullifier(nullifier);
    if (!note || !note.owner.equals(this.user.id)) {
      return;
    }
    await this.db.nullifyNote(nullifier);
    this.debug(`nullified note at index ${note.index} with value ${note.value}.`);
    return note;
  }

  private async addClaim(index: number, txId: TxId, commitment: Buffer, noteSecret: Buffer) {
    const nullifier = this.noteAlgos.claimNoteNullifier(commitment);
    await this.db.addClaimTx({
      txId,
      userId: this.user.id,
      secret: noteSecret,
      nullifier,
    });
    this.debug(`successfully decrypted claim note at index ${index}.`);
  }

  private recoverPaymentTx(
    proof: InnerProofData,
    offchainTxData: OffchainJoinSplitData,
    blockCreated: Date,
    valueNote: Note | undefined,
    changeNote: Note | undefined,
    destroyedNote1: Note | undefined,
    destroyedNote2: Note | undefined,
  ) {
    const proofId = proof.proofId as PaymentProofId;
    const assetId = proof.assetId.readUInt32BE(28);

    const publicValue = toBigIntBE(proof.publicValue);
    const publicOwner = publicValue ? new EthAddress(proof.publicOwner) : undefined;

    const noteValue = (note?: Note) => (note ? note.value : BigInt(0));
    const privateInput = noteValue(destroyedNote1) + noteValue(destroyedNote2);
    const recipientPrivateOutput = noteValue(valueNote);
    const senderPrivateOutput = noteValue(changeNote);

    const { txRefNo } = offchainTxData;

    return new CorePaymentTx(
      new TxId(proof.txId),
      this.user.id,
      proofId,
      assetId,
      publicValue,
      publicOwner,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      !!valueNote,
      !!changeNote,
      txRefNo,
      new Date(),
      blockCreated,
    );
  }

  private recoverAccountTx(proof: InnerProofData, offchainTxData: OffchainAccountData, blockCreated: Date) {
    const { nullifier1 } = proof;
    const { accountPublicKey, accountAliasId, spendingPublicKey1, spendingPublicKey2, txRefNo } = offchainTxData;
    const txId = new TxId(proof.txId);
    const userId = new AccountId(accountPublicKey, accountAliasId.accountNonce);
    const migrated = !!toBigIntBE(nullifier1);

    return new CoreAccountTx(
      txId,
      userId,
      accountAliasId.aliasHash,
      toBigIntBE(spendingPublicKey1) ? spendingPublicKey1 : undefined,
      toBigIntBE(spendingPublicKey2) ? spendingPublicKey2 : undefined,
      migrated,
      txRefNo,
      new Date(),
      blockCreated,
    );
  }

  private recoverDefiTx(
    proof: InnerProofData,
    offchainTxData: OffchainDefiDepositData,
    blockCreated: Date,
    interactionNonce: number,
    isAsync: boolean,
  ) {
    const { bridgeId, depositValue, txFee, partialStateSecretEphPubKey, txRefNo } = offchainTxData;
    const txId = new TxId(proof.txId);
    const partialStateSecret = deriveNoteSecret(partialStateSecretEphPubKey, this.user.privateKey, this.grumpkin);

    return new CoreDefiTx(
      txId,
      this.user.id,
      bridgeId,
      depositValue,
      txFee,
      partialStateSecret,
      txRefNo,
      new Date(),
      blockCreated,
      interactionNonce,
      isAsync,
    );
  }

  private async refreshNotePicker() {
    const notesMap: Map<number, Note[]> = new Map();
    const notes = await this.db.getUserNotes(this.user.id);
    notes.forEach(note => {
      const assetNotes = notesMap.get(note.assetId) || [];
      notesMap.set(note.assetId, [...assetNotes, note]);
    });
    const assetIds = [...notesMap.keys()].sort((a, b) => (a > b ? 1 : -1));
    this.notePickers = assetIds.map(assetId => ({ assetId, notePicker: new NotePicker(notesMap.get(assetId)) }));
  }

  public async pickNotes(assetId: number, value: bigint) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return notePicker ? notePicker.pick(value, pendingNullifiers) : null;
  }

  public async getSpendableNotes(assetId: number) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return notePicker ? notePicker.getSpendableNotes(pendingNullifiers).notes : [];
  }

  public async getSpendableSum(assetId: number) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return notePicker ? notePicker.getSpendableSum(pendingNullifiers) : BigInt(0);
  }

  public async getSpendableSums() {
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return this.notePickers.map(({ assetId, notePicker }) => ({
      assetId,
      value: notePicker.getSpendableSum(pendingNullifiers),
    }));
  }

  public async getMaxSpendableValue(assetId: number) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return notePicker ? notePicker.getMaxSpendableValue(pendingNullifiers) : BigInt(0);
  }

  public getBalance(assetId: number) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    return notePicker ? notePicker.getSum() : BigInt(0);
  }

  public getBalances() {
    return this.notePickers.map(({ assetId, notePicker }) => ({ assetId, value: notePicker.getSum() }));
  }

  public async addProof({ tx, proofData, outputNotes }: ProofOutput) {
    switch (tx.proofId) {
      case ProofId.DEPOSIT:
      case ProofId.WITHDRAW:
      case ProofId.SEND:
        this.debug(`adding pending payment tx: ${tx.txId}`);
        await this.db.addPaymentTx(tx);
        break;
      case ProofId.ACCOUNT:
        this.debug(`adding pending account tx: ${tx.txId}`);
        await this.db.addAccountTx(tx);
        break;
      case ProofId.DEFI_DEPOSIT:
        this.debug(`adding pending defi tx: ${tx.txId}`);
        await this.db.addDefiTx(tx);
        break;
    }

    const note1 = await this.processNewNote(
      0,
      proofData.noteCommitment1,
      outputNotes[0],
      proofData.allowChainFromNote1,
      true,
    );
    const note2 = await this.processNewNote(
      0,
      proofData.noteCommitment2,
      outputNotes[1],
      proofData.allowChainFromNote2,
      true,
    );
    if (note1?.value || note2?.value) {
      await this.refreshNotePicker();
    }

    // No need to do anything with proof.backwardLink (i.e., mark a note as chained).
    // Rollup provider will return the nullifiers of pending notes, which will be excluded when the sdk is picking notes.

    this.emit(UserStateEvent.UPDATED_USER_STATE, this.user.id);
  }
}

export class UserStateFactory {
  constructor(
    private grumpkin: Grumpkin,
    private noteAlgos: NoteAlgorithms,
    private db: Database,
    private rollupProvider: RollupProvider,
  ) {}

  createUserState(user: UserData) {
    return new UserState(user, this.grumpkin, this.noteAlgos, this.db, this.rollupProvider);
  }
}
