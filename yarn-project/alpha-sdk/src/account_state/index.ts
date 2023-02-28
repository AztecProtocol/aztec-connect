import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { retryUntil } from '@aztec/barretenberg/retry';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { Timer } from '@aztec/barretenberg/timer';
import { EventEmitter } from 'events';
import { AztecWalletProvider } from '../aztec_wallet_provider/index.js';
import { BlockContext } from '../block_context/index.js';
import { BlockProcessor } from '../block_processor/index.js';
import { CacheRequest } from '../cache_request/index.js';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx } from '../core_tx/index.js';
import { Database } from '../database/index.js';
import { Note } from '../note/index.js';
import { NotePicker, NotePickerOptions } from '../note_picker/index.js';
import { ProofOutput } from '../proofs/index.js';

const debug = createDebugLogger('bb:account_state');

export enum AccountStateEvent {
  UPDATED_ACCOUNT_STATE = 'UPDATED_ACCOUNT_STATE',
}

export class AccountState extends EventEmitter {
  private accountPublicKey!: GrumpkinAddress;
  private pendingNoteNullifiersRequest: CacheRequest<Buffer[]>;
  private notePickersRequest: CacheRequest<{ assetId: number; notePicker: NotePicker }[]>;
  private syncedToRollup = -1;

  constructor(
    private aztecWalletProvider: AztecWalletProvider,
    private blockProcessor: BlockProcessor,
    private rollupProvider: RollupProvider,
    private db: Database,
  ) {
    super();

    this.pendingNoteNullifiersRequest = new CacheRequest(async () => await rollupProvider.getPendingNoteNullifiers());
    this.notePickersRequest = new CacheRequest(async () => await this.getNotePickers());
  }

  private debug(...args: any[]) {
    const [first, ...rest] = args;
    debug(`${this.accountPublicKey.toShortString()}: ${first}`, ...rest);
  }

  /**
   * Purge pending txs no longer on server.
   */
  public async init() {
    this.accountPublicKey = await this.aztecWalletProvider.getAccountPublicKey();
    await this.resetData();
    const { syncedToRollup } = (await this.db.getAccount(this.accountPublicKey))!;
    this.syncedToRollup = syncedToRollup;
  }

  /**
   * Should be called before reading any state that has persistent storage that may have changed underfoot.
   * If the account has synched further underfoot, we refresh our notepicker and emit an update event.
   */
  public async syncFromDb() {
    const { syncedToRollup } = (await this.db.getAccount(this.accountPublicKey))!;
    if (syncedToRollup !== this.syncedToRollup) {
      this.syncedToRollup = syncedToRollup;
      this.notePickersRequest.clearCache();
      this.emit(AccountStateEvent.UPDATED_ACCOUNT_STATE, this.accountPublicKey);
    }
  }

  public isSynchronised(latestRollupId: number) {
    return this.syncedToRollup >= latestRollupId;
  }

  public async awaitSynchronised(latestRollupId: number, timeout?: number) {
    await retryUntil(() => this.isSynchronised(latestRollupId), 'account synchronised', timeout);
  }

  public getAccountPublicKey() {
    return this.accountPublicKey;
  }

  public getAztecWalletProvider() {
    return this.aztecWalletProvider;
  }

  public getSyncedToRollup() {
    return this.syncedToRollup;
  }

  /**
   * This function parces block data, but does not modify or update anything in the database.
   */
  public async decryptBlocks(blockContexts: BlockContext[]) {
    this.debug('decrypting notes...');

    const fromRollupId = blockContexts[0].rollup.rollupId;
    const decryptedData = await this.aztecWalletProvider.decryptBlocks(
      fromRollupId,
      fromRollupId + blockContexts.length,
    );
    const numDecryptedNotes = decryptedData.treeNotes.filter(n => !!n).length;
    this.debug(`decrypted ${numDecryptedNotes} notes`);

    this.debug('processing decrypted data...');
    const processedTxData = await this.blockProcessor.processBlocks(
      this.accountPublicKey,
      blockContexts,
      decryptedData,
    );
    this.debug(`found ${processedTxData.length} txs`);
    return processedTxData;
  }

  /**
   * This function parces block data, adds new data to database and modifies existing data if necessary.
   */
  public async processBlocks(blockContexts: BlockContext[]) {
    // Remove any blocks we've already processed.
    blockContexts = blockContexts.filter(b => b.rollup.rollupId > this.syncedToRollup);

    // If nothings left, or these blocks don't lead on immediately from last sync point, do nothing.
    if (blockContexts.length == 0 || blockContexts[0].rollup.rollupId !== this.syncedToRollup + 1) {
      return;
    }

    const timer = new Timer();
    const fromRollupId = blockContexts[0].rollup.rollupId;
    const toRollupId = blockContexts[blockContexts.length - 1].rollup.rollupId;
    this.debug(`synching blocks ${fromRollupId} to ${toRollupId}...`);

    const processedTxData = await this.decryptBlocks(blockContexts);
    for (const { tx, nullifiers, outputNotes, spendingKeys, claimTx } of processedTxData) {
      for (const nullifier of nullifiers) {
        const note = (await this.db.getNoteByNullifier(nullifier))!;
        await this.db.nullifyNote(nullifier);
        this.debug(`nullified note at index ${note.index} with value ${note.value}.`);
      }

      for (const note of outputNotes) {
        if (note.value) {
          await this.db.addNote(note);
          this.debug(`added note at index ${note.index} with value ${note.value} of asset ${note.treeNote.assetId}.`);
        }
      }

      for (const spendingKey of spendingKeys) {
        await this.db.addSpendingKey(spendingKey);
        this.debug(`added spending key ${spendingKey.key.toString('hex')}.`);
      }

      if (claimTx) {
        await this.db.addClaimTx(claimTx);
        this.debug(`added claim for ${claimTx.defiTxId}.`);
      }

      const { txId, proofId } = tx;
      this.debug(`added settled ${ProofId[proofId]} tx: ${txId}`);
      await this.addTx(tx);
    }

    this.syncedToRollup = toRollupId;
    await this.db.addAccount({ accountPublicKey: this.accountPublicKey, syncedToRollup: this.syncedToRollup });

    this.notePickersRequest.clearCache();
    this.emit(AccountStateEvent.UPDATED_ACCOUNT_STATE, this.accountPublicKey);

    this.debug(`synched from ${fromRollupId} to ${toRollupId} in ${timer.s()}s.`);
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
    this.debug(`adding pending ${ProofId[tx.proofId]} tx: ${tx.txId}`);
    await this.addTx(tx);

    await this.processPendingNote(outputNotes[0]);
    await this.processPendingNote(outputNotes[1]);

    // No need to do anything with proof.backwardLink (i.e., mark a note as chained).
    // But will have to clear the cache for pending note nullifers.
    // Rollup provider will return the nullifiers of pending notes, which will be excluded when the sdk is picking notes.
    this.pendingNoteNullifiersRequest.clearCache();
    this.notePickersRequest.clearCache();
    this.emit(AccountStateEvent.UPDATED_ACCOUNT_STATE, this.accountPublicKey);
  }

  // ---------------
  // PRIVATE METHODS
  // ---------------
  private async resetData() {
    const pendingTxs = await this.rollupProvider.getPendingTxs();

    const pendingUserTxIds = await this.db.getPendingTxs(this.accountPublicKey);
    for (const userTxId of pendingUserTxIds) {
      if (!pendingTxs.some(tx => tx.txId.equals(userTxId))) {
        await this.db.removeTx(this.accountPublicKey, userTxId);
      }
    }

    const pendingNotes = await this.db.getPendingNotes(this.accountPublicKey);
    for (const note of pendingNotes) {
      if (
        !pendingTxs.some(tx => tx.noteCommitment1.equals(note.commitment) || tx.noteCommitment2.equals(note.commitment))
      ) {
        await this.db.removeNote(note.nullifier);
      }
    }
  }

  private async addTx(tx: CorePaymentTx | CoreAccountTx | CoreDefiTx) {
    switch (tx.proofId) {
      case ProofId.DEPOSIT:
      case ProofId.WITHDRAW:
      case ProofId.SEND:
        await this.db.addPaymentTx(tx);
        break;
      case ProofId.ACCOUNT:
        await this.db.addAccountTx(tx);
        break;
      case ProofId.DEFI_DEPOSIT:
        await this.db.addDefiTx(tx);
        break;
    }
  }

  private async getNotePickers() {
    const notesMap: Map<number, Note[]> = new Map();
    const notes = await this.db.getNotes(this.accountPublicKey);
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
    if (!ownerPubKey.equals(this.accountPublicKey) || !note.allowChain) {
      return;
    }

    if (value) {
      await this.db.addNote(note);
      this.debug(`adding chainable pending note with value: ${value}.`);
    }

    return note;
  }
}

export class AccountStateFactory {
  constructor(private blockProcessor: BlockProcessor, private rollupProvider: RollupProvider, private db: Database) {}

  async createAccountState(aztecWalletProvider: AztecWalletProvider) {
    const accountState = new AccountState(aztecWalletProvider, this.blockProcessor, this.rollupProvider, this.db);
    await accountState.init();
    return accountState;
  }
}
