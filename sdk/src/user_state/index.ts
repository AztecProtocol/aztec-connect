import { EthAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { virtualAssetIdFlag } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { createDebugLogger } from '@aztec/barretenberg/log';
import {
  batchDecryptNotes,
  deriveNoteSecret,
  NoteAlgorithms,
  NoteDecryptor,
  recoverTreeNotes,
  TreeNote,
} from '@aztec/barretenberg/note_algorithms';
import {
  OffchainAccountData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { retryUntil } from '@aztec/barretenberg/retry';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { Timer } from '@aztec/barretenberg/timer';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { EventEmitter } from 'events';
import { BlockContext } from '../block_context/block_context';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, PaymentProofId } from '../core_tx';
import { Database } from '../database';
import { Note } from '../note';
import { NotePicker } from '../note_picker';
import { ProofOutput } from '../proofs';
import { UserData } from '../user';

const debug = createDebugLogger('bb:user_state');

export enum UserStateEvent {
  UPDATED_USER_STATE = 'UPDATED_USER_STATE',
}

export class UserState extends EventEmitter {
  private notePickers: { assetId: number; notePicker: NotePicker }[] = [];

  constructor(
    private userData: UserData,
    private grumpkin: Grumpkin,
    private noteAlgos: NoteAlgorithms,
    private noteDecryptor: NoteDecryptor,
    private db: Database,
    private rollupProvider: RollupProvider,
  ) {
    super();
  }

  private debug(...args: any[]) {
    const [first, ...rest] = args;
    debug(`${this.userData.accountPublicKey.toShortString()}: ${first}`, ...rest);
  }

  /**
   * Purge pending txs no longer on server. Load user state.
   */
  public async init() {
    await this.resetData();
    await this.refreshNotePicker();
  }

  /**
   * Should be called before reading any state that has persistent storage that may have changed underfoot.
   * If the user has synched further underfoot, we refresh our notepicker and emit an update event.
   */
  public async syncFromDb() {
    const { syncedToRollup } = (await this.db.getUser(this.userData.accountPublicKey))!;
    if (syncedToRollup !== this.userData.syncedToRollup) {
      this.userData.syncedToRollup = syncedToRollup;
      await this.refreshNotePicker();
      this.emit(UserStateEvent.UPDATED_USER_STATE, this.userData.accountPublicKey);
    }
  }

  public isSynchronised(latestRollupId: number) {
    return this.userData.syncedToRollup >= latestRollupId;
  }

  public async awaitSynchronised(latestRollupId: number, timeout?: number) {
    await retryUntil(() => this.isSynchronised(latestRollupId), 'user synchronised', timeout);
  }

  public getUserData(): UserData {
    return { ...this.userData };
  }

  // Deprecated: Used in tests.
  public async processBlock(blockContext: BlockContext) {
    await this.processBlocks([blockContext]);
  }

  public async processBlocks(blockContexts: BlockContext[]) {
    // Remove any blocks we've already processed.
    blockContexts = blockContexts.filter(b => b.rollup.rollupId > this.userData.syncedToRollup);

    // If nothings left, or these blocks don't lead on immediately from last sync point, do nothing.
    if (blockContexts.length == 0 || blockContexts[0].rollup.rollupId !== this.userData.syncedToRollup + 1) {
      return;
    }

    const timer = new Timer();
    const from = blockContexts[0].rollup.rollupId;
    this.debug(`synching blocks ${from} to ${from + blockContexts.length - 1}...`);

    const rollupProofData = blockContexts.map(b => b.rollup);
    const innerProofs = rollupProofData.map(p => p.innerProofData.filter(i => !i.isPadding())).flat();
    const offchainTxDataBuffers = blockContexts.map(b => b.offchainTxData).flat();
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

    this.debug(`decrypting notes...`);
    const decryptedTreeNotes = await batchDecryptNotes(
      viewingKeysBuf,
      this.userData.accountPrivateKey,
      this.noteDecryptor,
      this.grumpkin,
    );

    const treeNotes = recoverTreeNotes(
      decryptedTreeNotes,
      inputNullifiers,
      noteCommitments,
      this.userData.accountPrivateKey,
      this.grumpkin,
      this.noteAlgos,
    );

    this.debug(`handling txs...`);
    let treeNoteStartIndex = 0;
    let offchainJoinSplitIndex = 0;
    let offchainAccountIndex = 0;
    let offchainDefiIndex = 0;
    for (let blockIndex = 0; blockIndex < blockContexts.length; ++blockIndex) {
      const blockContext = blockContexts[blockIndex];
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
            const offchainTxData = offchainJoinSplitData[offchainJoinSplitIndex++];
            const [note1, note2] = treeNotes.slice(treeNoteStartIndex, treeNoteStartIndex + 2);
            treeNoteStartIndex += 2;
            if (!note1 && !note2) {
              continue;
            }
            await this.handlePaymentTx(blockContext, proof, offchainTxData, noteStartIndex, note1, note2);
            break;
          }
          case ProofId.ACCOUNT: {
            const offchainTxData = offchainAccountData[offchainAccountIndex++];
            await this.handleAccountTx(blockContext, proof, offchainTxData, noteStartIndex);
            break;
          }
          case ProofId.DEFI_DEPOSIT: {
            const note2 = treeNotes[treeNoteStartIndex];
            treeNoteStartIndex++;
            const offchainTxData = offchainDefiDepositData[offchainDefiIndex++];
            if (!note2) {
              // Both notes should be owned by the same user.
              continue;
            }
            await this.handleDefiDepositTx(blockContext, proofData, proof, offchainTxData, noteStartIndex, note2);
            break;
          }
          case ProofId.DEFI_CLAIM:
            await this.handleDefiClaimTx(blockContext, proof, noteStartIndex);
            break;
        }
      }

      this.userData.syncedToRollup = proofData.rollupId;

      await this.processDefiInteractionResults(blockContext);
    }

    await this.db.updateUser(this.userData);

    this.emit(UserStateEvent.UPDATED_USER_STATE, this.userData.accountPublicKey);

    this.debug(`done in ${timer.s()}s.`);
  }

  public async pickNotes(assetId: number, value: bigint, spendingKeyRequired = false, excludePendingNotes = false) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    if (!notePicker) {
      return [];
    }
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return notePicker.pick(value, pendingNullifiers, excludePendingNotes, spendingKeyRequired);
  }

  public async pickNote(assetId: number, value: bigint, spendingKeyRequired = false, excludePendingNotes = false) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    if (!notePicker) {
      return;
    }
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return notePicker.pickOne(value, pendingNullifiers, excludePendingNotes, spendingKeyRequired);
  }

  public async getSpendableSum(assetId: number, spendingKeyRequired = false, excludePendingNotes = false) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    if (!notePicker) {
      return BigInt(0);
    }
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return notePicker.getSpendableSum(pendingNullifiers, excludePendingNotes, spendingKeyRequired);
  }

  public async getSpendableSums(spendingKeyRequired = false, excludePendingNotes = false) {
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return this.notePickers
      .map(({ assetId, notePicker }) => ({
        assetId,
        value: notePicker.getSpendableSum(pendingNullifiers, excludePendingNotes, spendingKeyRequired),
      }))
      .filter(assetValue => assetValue.value > BigInt(0));
  }

  public async getMaxSpendableValue(
    assetId: number,
    spendingKeyRequired = false,
    excludePendingNotes = false,
    numNotes?: number,
  ) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    if (!notePicker) {
      return BigInt(0);
    }
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return notePicker.getMaxSpendableValue(pendingNullifiers, numNotes, excludePendingNotes, spendingKeyRequired);
  }

  public getBalance(assetId: number) {
    const { notePicker } = this.notePickers.find(np => np.assetId === assetId) || {};
    return notePicker ? notePicker.getSum() : BigInt(0);
  }

  public getBalances() {
    return this.notePickers
      .map(({ assetId, notePicker }) => ({ assetId, value: notePicker.getSum() }))
      .filter(assetValue => assetValue.value > BigInt(0));
  }

  public async addProof({ tx, outputNotes }: ProofOutput) {
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

    const note1 = outputNotes[0] && (await this.processPendingNote(outputNotes[0]));
    const note2 = outputNotes[1] && (await this.processPendingNote(outputNotes[1]));
    if (note1?.value || note2?.value) {
      await this.refreshNotePicker();
    }

    // No need to do anything with proof.backwardLink (i.e., mark a note as chained).
    // Rollup provider will return the nullifiers of pending notes, which will be excluded when the sdk is picking notes.

    this.emit(UserStateEvent.UPDATED_USER_STATE, this.userData.accountPublicKey);
  }

  // ---------------
  // PRIVATE METHODS
  // ---------------

  private async resetData() {
    const pendingTxs = await this.rollupProvider.getPendingTxs();

    const pendingUserTxIds = await this.db.getPendingUserTxs(this.userData.accountPublicKey);
    for (const userTxId of pendingUserTxIds) {
      if (!pendingTxs.some(tx => tx.txId.equals(userTxId))) {
        await this.db.removeUserTx(this.userData.accountPublicKey, userTxId);
      }
    }

    const pendingNotes = await this.db.getPendingNotes(this.userData.accountPublicKey);
    for (const note of pendingNotes) {
      if (
        !pendingTxs.some(tx => tx.noteCommitment1.equals(note.commitment) || tx.noteCommitment2.equals(note.commitment))
      ) {
        await this.db.removeNote(note.nullifier);
      }
    }
  }

  private async handleAccountTx(
    blockContext: BlockContext,
    proof: InnerProofData,
    offchainTxData: OffchainAccountData,
    noteStartIndex: number,
  ) {
    const { created } = blockContext;
    const tx = this.recoverAccountTx(proof, offchainTxData, created);
    if (!tx.userId.equals(this.userData.accountPublicKey)) {
      return;
    }

    const { txId, userId, newSpendingPublicKey1, newSpendingPublicKey2 } = tx;

    if (newSpendingPublicKey1) {
      this.debug(`added spending key ${newSpendingPublicKey1.toString('hex')}.`);
      const hashPath = await blockContext.getBlockSubtreeHashPath(noteStartIndex);
      await this.db.addSpendingKey({
        userId,
        key: newSpendingPublicKey1,
        treeIndex: noteStartIndex,
        hashPath: hashPath.toBuffer(),
      });
    }

    if (newSpendingPublicKey2) {
      this.debug(`added spending key ${newSpendingPublicKey2.toString('hex')}.`);
      const hashPath = await blockContext.getBlockSubtreeHashPath(noteStartIndex + 1);
      await this.db.addSpendingKey({
        userId,
        key: newSpendingPublicKey2,
        treeIndex: noteStartIndex + 1,
        hashPath: hashPath.toBuffer(),
      });
    }

    const savedTx = await this.db.getAccountTx(txId);
    if (savedTx) {
      this.debug(`settling account tx: ${txId.toString()}`);
      await this.db.settleAccountTx(txId, blockContext.created);
    } else {
      this.debug(`recovered account tx: ${txId.toString()}`);
      await this.db.addAccountTx(tx);
    }
  }

  private async handlePaymentTx(
    blockContext: BlockContext,
    proof: InnerProofData,
    offchainTxData: OffchainJoinSplitData,
    noteStartIndex: number,
    note1?: TreeNote,
    note2?: TreeNote,
  ) {
    const { created } = blockContext;
    const { noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = proof;
    const newNote = note1
      ? await this.processSettledNote(noteStartIndex, note1, noteCommitment1, blockContext)
      : undefined;
    const changeNote = note2
      ? await this.processSettledNote(noteStartIndex + 1, note2, noteCommitment2, blockContext)
      : undefined;
    if (!newNote && !changeNote) {
      // Neither note was decrypted (change note should always belong to us for txs we created).
      return;
    }

    const destroyedNote1 = await this.nullifyNote(nullifier1);
    const destroyedNote2 = await this.nullifyNote(nullifier2);

    await this.refreshNotePicker();

    const txId = new TxId(proof.txId);
    const savedTx = await this.db.getPaymentTx(this.userData.accountPublicKey, txId);
    if (savedTx) {
      this.debug(`settling payment tx: ${txId}`);
      await this.db.settlePaymentTx(this.userData.accountPublicKey, txId, created);
    } else {
      const tx = this.recoverPaymentTx(
        proof,
        offchainTxData,
        created,
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
    blockContext: BlockContext,
    rollupProofData: RollupProofData,
    proof: InnerProofData,
    offchainTxData: OffchainDefiDepositData,
    noteStartIndex: number,
    treeNote2: TreeNote,
  ) {
    const { interactionResult, created } = blockContext;
    const { noteCommitment1, noteCommitment2 } = proof;
    const note2 = await this.processSettledNote(noteStartIndex + 1, treeNote2, noteCommitment2, blockContext);
    if (!note2) {
      // Owned by the account with a different nonce.
      return;
    }
    const { bridgeId, partialState, partialStateSecretEphPubKey } = offchainTxData;
    const partialStateSecret = deriveNoteSecret(
      partialStateSecretEphPubKey,
      this.userData.accountPrivateKey,
      this.grumpkin,
    );
    const txId = new TxId(proof.txId);
    const { rollupId, bridgeIds } = rollupProofData;
    const interactionNonce =
      RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK * rollupId +
      bridgeIds.findIndex(bridge => bridge.equals(bridgeId.toBuffer()));
    const isAsync = interactionResult.every(n => n.nonce !== interactionNonce);

    await this.addClaim(txId, noteCommitment1, partialState, partialStateSecret, interactionNonce);

    const { nullifier1, nullifier2 } = proof;
    await this.nullifyNote(nullifier1);
    await this.nullifyNote(nullifier2);

    await this.refreshNotePicker();

    const savedTx = await this.db.getDefiTx(txId);
    if (savedTx) {
      this.debug(`found defi tx, awaiting claim for settlement: ${txId}`);
      await this.db.settleDefiDeposit(txId, interactionNonce, isAsync, created);
    } else {
      const tx = this.recoverDefiTx(proof, offchainTxData, created, interactionNonce, isAsync);
      this.debug(`recovered defi tx: ${txId}`);
      await this.db.addDefiTx(tx);
    }
  }

  private async processDefiInteractionResults(blockContext: BlockContext) {
    const { interactionResult, created } = blockContext;
    for (const event of interactionResult) {
      const defiTxs = await this.db.getDefiTxsByNonce(this.userData.accountPublicKey, event.nonce);
      for (const tx of defiTxs) {
        const outputValueA = !event.result
          ? BigInt(0)
          : (event.totalOutputValueA * tx.depositValue) / event.totalInputValue;
        const outputValueB = !event.result
          ? BigInt(0)
          : (event.totalOutputValueB * tx.depositValue) / event.totalInputValue;
        await this.db.updateDefiTxFinalisationResult(tx.txId, event.result, outputValueA, outputValueB, created);
      }
    }
  }

  private async handleDefiClaimTx(blockContext: BlockContext, proof: InnerProofData, noteStartIndex: number) {
    const { nullifier1 } = proof;
    const claimTxId = new TxId(proof.txId);

    const claim = await this.db.getClaimTx(nullifier1);
    if (!claim?.userId.equals(this.userData.accountPublicKey)) {
      return;
    }

    this.debug(`found claim tx: ${claimTxId}`);
    const { created } = blockContext;
    const { defiTxId, userId, partialState, secret, interactionNonce } = claim;
    const { noteCommitment1, noteCommitment2, nullifier2 } = proof;
    const { bridgeId, depositValue, outputValueA, outputValueB, success } = (await this.db.getDefiTx(defiTxId))!;
    const accountRequired = this.noteAlgos
      .valueNotePartialCommitment(
        secret,
        userId,
        true, // accountRequired
      )
      .equals(partialState);

    // When generating output notes, set creatorPubKey to 0 (it's a DeFi txn, recipient of note is same as creator of claim note)
    if (!success) {
      {
        const treeNote = new TreeNote(
          userId,
          depositValue,
          bridgeId.inputAssetIdA,
          accountRequired,
          secret,
          Buffer.alloc(32),
          nullifier1,
        );
        await this.processSettledNote(noteStartIndex, treeNote, noteCommitment1, blockContext);
      }

      if (bridgeId.numInputAssets === 2) {
        const treeNote = new TreeNote(
          userId,
          depositValue,
          bridgeId.inputAssetIdB!,
          accountRequired,
          secret,
          Buffer.alloc(32),
          nullifier2,
        );
        await this.processSettledNote(noteStartIndex + 1, treeNote, noteCommitment2, blockContext);
      }
    }
    if (outputValueA) {
      const treeNote = new TreeNote(
        userId,
        outputValueA,
        bridgeId.firstOutputVirtual ? virtualAssetIdFlag + interactionNonce : bridgeId.outputAssetIdA,
        accountRequired,
        secret,
        Buffer.alloc(32),
        nullifier1,
      );
      await this.processSettledNote(noteStartIndex, treeNote, noteCommitment1, blockContext);
    }
    if (outputValueB) {
      const treeNote = new TreeNote(
        userId,
        outputValueB,
        bridgeId.secondOutputVirtual ? virtualAssetIdFlag + interactionNonce : bridgeId.outputAssetIdB!,
        accountRequired,
        secret,
        Buffer.alloc(32),
        nullifier2,
      );
      await this.processSettledNote(noteStartIndex + 1, treeNote, noteCommitment2, blockContext);
    }

    await this.refreshNotePicker();

    await this.db.settleDefiTx(defiTxId, created, claimTxId);
    this.debug(`settled defi tx: ${defiTxId}`);
  }

  private async processSettledNote(index: number, treeNote: TreeNote, commitment: Buffer, blockContext: BlockContext) {
    const { value } = treeNote;
    const hashPath = await blockContext.getBlockSubtreeHashPath(index);
    const nullifier = this.noteAlgos.valueNoteNullifier(commitment, this.userData.accountPrivateKey);
    const note = new Note(
      treeNote,
      commitment,
      nullifier,
      false, // allowChain
      false, // nullified
      index,
      hashPath.toBuffer(),
    );

    if (value) {
      await this.db.addNote(note);
      this.debug(`successfully decrypted note at index ${index} with value ${value} of asset ${treeNote.assetId}.`);
    }

    return note;
  }

  private async nullifyNote(nullifier: Buffer) {
    const note = await this.db.getNoteByNullifier(nullifier);
    if (!note || !note.owner.equals(this.userData.accountPublicKey)) {
      return;
    }

    await this.db.nullifyNote(nullifier);
    this.debug(`nullified note at index ${note.index} with value ${note.value}.`);
    return note;
  }

  private async addClaim(
    defiTxId: TxId,
    commitment: Buffer,
    partialState: Buffer,
    noteSecret: Buffer,
    interactionNonce: number,
  ) {
    const nullifier = this.noteAlgos.claimNoteNullifier(commitment);
    await this.db.addClaimTx({
      defiTxId,
      userId: this.userData.accountPublicKey,
      partialState,
      secret: noteSecret,
      nullifier,
      interactionNonce,
    });
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
    const isRecipient = !!valueNote;
    const isSender = !!changeNote;

    const { txRefNo } = offchainTxData;

    return new CorePaymentTx(
      new TxId(proof.txId),
      this.userData.accountPublicKey,
      proofId,
      assetId,
      publicValue,
      publicOwner,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      isRecipient,
      isSender,
      txRefNo,
      new Date(),
      blockCreated,
    );
  }

  private recoverAccountTx(proof: InnerProofData, offchainTxData: OffchainAccountData, blockCreated: Date) {
    const { accountPublicKey, aliasHash, spendingPublicKey1, spendingPublicKey2, txRefNo } = offchainTxData;
    const txId = new TxId(proof.txId);
    const { nullifier1, nullifier2 } = proof;
    // A tx is for account migration when it nullifies the accountPublicKey (nullifier2) but not the aliasHash (nullifier1).
    const migrated = !toBigIntBE(nullifier1) && !!toBigIntBE(nullifier2);

    return new CoreAccountTx(
      txId,
      accountPublicKey,
      aliasHash,
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
    const { bridgeId, depositValue, txFee, txRefNo } = offchainTxData;
    const txId = new TxId(proof.txId);
    return new CoreDefiTx(
      txId,
      this.userData.accountPublicKey,
      bridgeId,
      depositValue,
      txFee,
      txRefNo,
      new Date(),
      blockCreated,
      interactionNonce,
      isAsync,
    );
  }

  private async refreshNotePicker() {
    const notesMap: Map<number, Note[]> = new Map();
    const notes = await this.db.getNotes(this.userData.accountPublicKey);
    notes.forEach(note => {
      const assetNotes = notesMap.get(note.assetId) || [];
      notesMap.set(note.assetId, [...assetNotes, note]);
    });
    const assetIds = [...notesMap.keys()].sort((a, b) => (a > b ? 1 : -1));
    this.notePickers = assetIds.map(assetId => ({ assetId, notePicker: new NotePicker(notesMap.get(assetId)) }));
  }

  private async processPendingNote(note: Note) {
    const { ownerPubKey, value } = note.treeNote;
    if (!ownerPubKey.equals(this.userData.accountPublicKey)) {
      return;
    }

    if (value) {
      await this.db.addNote(note);
      this.debug(`adding pending note with value: ${value}, allowChain: ${note.allowChain}.`);
    }

    return note;
  }
}

export class UserStateFactory {
  constructor(
    private grumpkin: Grumpkin,
    private noteAlgos: NoteAlgorithms,
    private noteDecryptor: NoteDecryptor,
    private db: Database,
    private rollupProvider: RollupProvider,
  ) {}

  async createUserState(user: UserData) {
    const userState = new UserState(
      user,
      this.grumpkin,
      this.noteAlgos,
      this.noteDecryptor,
      this.db,
      this.rollupProvider,
    );
    await userState.init();
    return userState;
  }
}
