import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { createDebugLogger } from '@aztec/barretenberg/log';
import {
  batchDecryptNotes,
  NoteAlgorithms,
  NoteDecryptor,
  recoverTreeNotes,
} from '@aztec/barretenberg/note_algorithms';
import {
  OffchainAccountData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { retryUntil } from '@aztec/barretenberg/retry';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { Timer } from '@aztec/barretenberg/timer';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { EventEmitter } from 'events';
import { BlockContext } from '../block_context/block_context.js';
import { CacheRequest } from '../cache_request/index.js';
import { Database } from '../database/index.js';
import { BoundedSerialQueue } from '@aztec/barretenberg/fifo';
import { Note } from '../note/index.js';
import { NotePicker, NotePickerOptions } from '../note_picker/index.js';
import { ProofOutput } from '../proofs/index.js';
import { UserData } from '../user/index.js';
import { DbOps } from './db_ops.js';

const debug = createDebugLogger('bb:user_state');
const debugDecrypt = createDebugLogger('bb:user_state_decrypt');

export enum UserStateEvent {
  UPDATED_USER_STATE = 'UPDATED_USER_STATE',
}

export class UserState extends EventEmitter {
  private pendingNoteNullifiersRequest: CacheRequest<Buffer[]>;
  private notePickersRequest: CacheRequest<{ assetId: number; notePicker: NotePicker }[]>;
  private decryptQueue = new BoundedSerialQueue(10);
  private dbOpsQueue = new BoundedSerialQueue(10);
  private latestQueuedRollup: number;

  constructor(
    private userData: UserData,
    private grumpkin: Grumpkin,
    private noteAlgos: NoteAlgorithms,
    private noteDecryptor: NoteDecryptor,
    private db: Database,
    private rollupProvider: RollupProvider,
  ) {
    super();

    this.pendingNoteNullifiersRequest = new CacheRequest(async () => await rollupProvider.getPendingNoteNullifiers());
    this.notePickersRequest = new CacheRequest(async () => await this.getNotePickers());
    this.latestQueuedRollup = userData.syncedToRollup;
  }

  public async init() {
    await this.resetData();
    this.decryptQueue.start();
    this.dbOpsQueue.start();
  }

  public async shutdown(flush = false) {
    if (flush) {
      await this.decryptQueue.end();
      await this.dbOpsQueue.end();
    } else {
      await this.decryptQueue.cancel();
      await this.dbOpsQueue.cancel();
    }
  }

  public async flush() {
    await this.decryptQueue.syncPoint();
    await this.dbOpsQueue.syncPoint();
  }

  /**
   * Should be called before reading any state that has persistent storage that may have changed underfoot.
   * If the user has synched further underfoot, we refresh our notepicker and emit an update event.
   */
  public async syncFromDb() {
    const { syncedToRollup } = (await this.db.getUser(this.userData.accountPublicKey))!;
    if (syncedToRollup !== this.userData.syncedToRollup) {
      this.userData.syncedToRollup = syncedToRollup;
      this.notePickersRequest.clearCache();
      this.emit(UserStateEvent.UPDATED_USER_STATE, this.userData.accountPublicKey);
    }
  }

  public isSynchronised(latestRollupId: number) {
    // this.debug(`isSynchronised: ${this.userData.syncedToRollup} >= ${latestRollupId}`);
    return this.userData.syncedToRollup >= latestRollupId;
  }

  public async awaitSynchronised(latestRollupId: number, timeout?: number) {
    await retryUntil(() => this.isSynchronised(latestRollupId), 'user synchronised', timeout);
  }

  public getUserData(): UserData {
    return { ...this.userData };
  }

  public processBlocks(blockContexts: BlockContext[]) {
    return this.decryptQueue.put(() => this.handleBlocks(blockContexts));
  }

  public async handleBlocks(blockContexts: BlockContext[]) {
    // Remove any blocks we've already processed.
    blockContexts = blockContexts.filter(b => b.rollup.rollupId > this.latestQueuedRollup);

    // If nothings left, or these blocks don't lead on immediately from last queued rollup, do nothing.
    if (blockContexts.length == 0) {
      this.debugDecrypt(`no blocks left after filtering.`);
      return;
    } else if (blockContexts[0].rollup.rollupId !== this.latestQueuedRollup + 1) {
      this.debugDecrypt(
        `ignoring non contiguous blocks, ${blockContexts[0].rollup.rollupId} !== ${this.latestQueuedRollup + 1}`,
      );
      return;
    }

    this.latestQueuedRollup = blockContexts[blockContexts.length - 1].rollup.rollupId;

    const timer = new Timer();
    const from = blockContexts[0].rollup.rollupId;
    this.debugDecrypt(`blocks ${from} to ${from + blockContexts.length - 1}...`);

    const rollupProofData = blockContexts.map(b => b.rollup);
    const innerProofs = rollupProofData.map(p => p.getNonPaddingProofs()).flat();
    const offchainTxDataBuffers = blockContexts.map(b => b.block.offchainTxData).flat();
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
      this.userData.accountPrivateKey,
      this.noteDecryptor,
      this.grumpkin,
    );

    const treeNotes = recoverTreeNotes(
      decryptedTreeNotes,
      inputNullifiers,
      noteCommitments,
      this.userData.accountPublicKey,
      this.noteAlgos,
    );
    this.debugDecrypt(`done in ${timer.s()}s.`);

    await this.dbOpsQueue.put(async () => {
      const dbOps = new DbOps(this.userData, this.noteAlgos, this.db, this.grumpkin);
      await dbOps.handleTxs({
        blockContexts,
        rollupProofData,
        offchainJoinSplitData,
        offchainAccountData,
        offchainDefiDepositData,
        treeNotes,
      });
      this.notePickersRequest.clearCache();
      this.emit(UserStateEvent.UPDATED_USER_STATE, this.userData.accountPublicKey);
    });
  }

  public async pickNotes(assetId: number, value: bigint, options: NotePickerOptions = {}) {
    const { notePicker } = (await this.notePickersRequest.get()).find(np => np.assetId === assetId) || {};
    if (!notePicker) {
      return [];
    }
    const pendingNullifiers = await this.pendingNoteNullifiersRequest.get();
    return notePicker.pick(value, {
      ...options,
      excludedNullifiers: [...(options.excludedNullifiers || []), ...pendingNullifiers],
    });
  }

  public async pickNote(assetId: number, value: bigint, options: NotePickerOptions = {}) {
    const { notePicker } = (await this.notePickersRequest.get()).find(np => np.assetId === assetId) || {};
    if (!notePicker) {
      return;
    }
    const pendingNullifiers = await this.pendingNoteNullifiersRequest.get();
    return notePicker.pickOne(value, {
      ...options,
      excludedNullifiers: [...(options.excludedNullifiers || []), ...pendingNullifiers],
    });
  }

  public async getSpendableNoteValues(assetId: number, options: NotePickerOptions = {}) {
    const { notePicker } = (await this.notePickersRequest.get()).find(np => np.assetId === assetId) || {};
    if (!notePicker) {
      return [];
    }
    const pendingNullifiers = await this.pendingNoteNullifiersRequest.get();
    return notePicker.getSpendableNoteValues({
      ...options,
      excludedNullifiers: [...(options.excludedNullifiers || []), ...pendingNullifiers],
    });
  }

  public async getSpendableSum(assetId: number, options: NotePickerOptions = {}) {
    const { notePicker } = (await this.notePickersRequest.get()).find(np => np.assetId === assetId) || {};
    if (!notePicker) {
      return BigInt(0);
    }
    const pendingNullifiers = await this.pendingNoteNullifiersRequest.get();
    return notePicker
      .getSpendableNoteValues({
        ...options,
        excludedNullifiers: [...(options.excludedNullifiers || []), ...pendingNullifiers],
      })
      .reduce((sum, v) => sum + v, BigInt(0));
  }

  public async getSpendableSums(options: NotePickerOptions = {}) {
    const pendingNullifiers = await this.pendingNoteNullifiersRequest.get();
    return (await this.notePickersRequest.get())
      .map(({ assetId, notePicker }) => ({
        assetId,
        value: notePicker
          .getSpendableNoteValues({
            ...options,
            excludedNullifiers: [...(options.excludedNullifiers || []), ...pendingNullifiers],
          })
          .reduce((sum, v) => sum + v, BigInt(0)),
      }))
      .filter(assetValue => assetValue.value > BigInt(0));
  }

  public async getMaxSpendableNoteValues(assetId: number, options: NotePickerOptions & { numNotes?: number } = {}) {
    const { notePicker } = (await this.notePickersRequest.get()).find(np => np.assetId === assetId) || {};
    if (!notePicker) {
      return [];
    }
    const pendingNullifiers = await this.pendingNoteNullifiersRequest.get();
    return notePicker.getMaxSpendableNoteValues({
      ...options,
      excludedNullifiers: [...(options.excludedNullifiers || []), ...pendingNullifiers],
    });
  }

  public async getBalance(assetId: number) {
    const { notePicker } = (await this.notePickersRequest.get()).find(np => np.assetId === assetId) || {};
    return notePicker ? notePicker.getSum() : BigInt(0);
  }

  public async getBalances() {
    return (await this.notePickersRequest.get())
      .map(({ assetId, notePicker }) => ({ assetId, value: notePicker.getSum() }))
      .filter(assetValue => assetValue.value > BigInt(0));
  }

  public async addProof({ tx, outputNotes }: ProofOutput) {
    switch (tx.proofId) {
      case ProofId.DEPOSIT:
      case ProofId.WITHDRAW:
      case ProofId.SEND:
        this.debug(`adding pending payment tx: ${tx.txId}`);
        await this.db.upsertPaymentTx(tx);
        break;
      case ProofId.ACCOUNT:
        this.debug(`adding pending account tx: ${tx.txId}`);
        await this.db.upsertAccountTx(tx);
        break;
      case ProofId.DEFI_DEPOSIT: {
        this.debug(`adding pending defi tx: ${tx.txId}`);
        await this.db.upsertDefiTx(tx);
        break;
      }
    }

    await this.processPendingNote(outputNotes[0]);
    await this.processPendingNote(outputNotes[1]);

    // No need to do anything with proof.backwardLink (i.e., mark a note as chained).
    // But will have to clear the cache for pending note nullifers.
    // Rollup provider will return the nullifiers of pending notes, which will be excluded when the sdk is picking notes.
    this.pendingNoteNullifiersRequest.clearCache();
    this.notePickersRequest.clearCache();
    this.emit(UserStateEvent.UPDATED_USER_STATE, this.userData.accountPublicKey);
  }

  // ---------------
  // PRIVATE METHODS
  // ---------------

  /**
   * Purge pending txs no longer on server.
   */
  private async resetData() {
    const pendingTxs = await this.rollupProvider.getPendingTxs();

    const pendingUserTxIds = (await this.db.getPendingUserTxs(this.userData.accountPublicKey)).map(tx => tx.txId);
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

  private async getNotePickers() {
    const notesMap: Map<number, Note[]> = new Map();
    const notes = await this.db.getNotes(this.userData.accountPublicKey);
    notes.forEach(note => {
      const assetNotes = notesMap.get(note.assetId) || [];
      notesMap.set(note.assetId, [...assetNotes, note]);
    });
    const assetIds = [...notesMap.keys()].sort((a, b) => (a > b ? 1 : -1));
    return assetIds.map(assetId => ({ assetId, notePicker: new NotePicker(notesMap.get(assetId)) }));
  }

  private async processPendingNote(note?: Note) {
    if (!note) {
      return;
    }

    const { ownerPubKey, value } = note.treeNote;
    if (!ownerPubKey.equals(this.userData.accountPublicKey) || !note.allowChain) {
      return;
    }

    if (value) {
      await this.db.addNote(note);
      this.debug(`adding chainable pending note with value: ${value}.`);
    }

    return note;
  }

  private debug(...args: any[]) {
    const [first, ...rest] = args;
    debug(`${this.userData.accountPublicKey.toShortString()}: ${first}`, ...rest);
  }

  private debugDecrypt(...args: any[]) {
    const [first, ...rest] = args;
    debugDecrypt(`${this.userData.accountPublicKey.toShortString()}: ${first}`, ...rest);
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
