import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { Block } from 'barretenberg/block_source';
import { decryptNote } from 'barretenberg/client_proofs/note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { computeAccountAliasIdNullifier } from 'barretenberg/client_proofs/account_proof';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { MemoryFifo } from 'barretenberg/fifo';
import { AssetId, AssetIds } from 'barretenberg/asset';
import { InnerProofData, RollupProofData } from 'barretenberg/rollup_proof';
import { RollupProvider } from 'barretenberg/rollup_provider';
import { toBigIntBE } from 'bigint-buffer';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { Database } from '../database';
import { Note } from '../note';
import { NotePicker } from '../note_picker';
import { AccountAliasId, UserData } from '../user';
import { UserAccountTx, UserJoinSplitTx } from '../user_tx';
import { AccountId } from '../user/account_id';
import { ViewingKey } from 'barretenberg/viewing_key';
import { TxHash } from 'barretenberg/tx_hash';

const debug = createDebug('bb:user_state');

export enum UserStateEvent {
  UPDATED_USER_STATE = 'UPDATED_USER_STATE',
}

enum SyncState {
  OFF,
  SYNCHING,
  MONITORING,
}

export class UserState extends EventEmitter {
  private notePickers: Map<AssetId, NotePicker> = new Map();
  private blockQueue = new MemoryFifo<Block>();
  private syncState = SyncState.OFF;
  private syncingPromise!: Promise<void>;

  constructor(
    private user: UserData,
    private grumpkin: Grumpkin,
    private pedersen: Pedersen,
    private noteAlgos: NoteAlgorithms,
    private db: Database,
    private rollupProvider: RollupProvider,
  ) {
    super();
  }

  public async init() {
    await this.refreshNotePicker();
  }

  /**
   * First handles all historical blocks.
   * Then starts processing blocks added to queue via `processBlock()`.
   */
  public async startSync() {
    if (this.syncState !== SyncState.OFF) {
      return;
    }
    debug(`starting sync for ${this.user.id} from rollup block ${this.user.syncedToRollup + 1}...`);
    this.syncState = SyncState.SYNCHING;
    const blocks = await this.rollupProvider.getBlocks(this.user.syncedToRollup + 1);
    for (const block of blocks) {
      if (this.syncState !== SyncState.SYNCHING) {
        return;
      }
      await this.handleBlock(block);
    }
    this.syncingPromise = this.blockQueue.process(async block => this.handleBlock(block));
    this.syncState = SyncState.MONITORING;
  }

  /**
   * Stops processing queued blocks. Blocks until any processing is complete.
   */
  public stopSync(flush = false) {
    if (this.syncState === SyncState.OFF) {
      return;
    }
    debug(`stopping sync for ${this.user.id}.`);
    flush ? this.blockQueue.end() : this.blockQueue.cancel();
    this.syncState = SyncState.OFF;
    return this.syncingPromise;
  }

  public isSyncing() {
    return this.syncState === SyncState.SYNCHING;
  }

  public getUser() {
    return this.user;
  }

  public processBlock(block: Block) {
    this.blockQueue.put(block);
  }

  private async handleBlock(block: Block) {
    if (block.rollupId <= this.user.syncedToRollup) {
      return;
    }

    const balancesBefore = AssetIds.map(assetId => this.getBalance(assetId));

    const { rollupProofData, viewingKeysData } = block;
    const { rollupId, dataStartIndex, innerProofData, viewingKeys } = RollupProofData.fromBuffer(
      rollupProofData,
      viewingKeysData,
    );
    for (let i = 0; i < innerProofData.length; ++i) {
      const proof = innerProofData[i];
      const noteStartIndex = dataStartIndex + i * 2;

      switch (proof.proofId) {
        case 0:
          await this.handleJoinSplitTx(innerProofData[i], noteStartIndex, viewingKeys[i]);
          break;
        case 1:
          await this.handleAccountTx(innerProofData[i], noteStartIndex);
          break;
      }
    }

    this.user.syncedToRollup = rollupId;
    await this.db.updateUser(this.user);

    AssetIds.forEach((assetId, i) => {
      const balanceAfter = this.getBalance(assetId);
      const diff = balanceAfter - balancesBefore[i];
      if (diff) {
        this.emit(UserStateEvent.UPDATED_USER_STATE, this.user.id, balanceAfter, diff, assetId);
      }
    });
  }

  private async handleAccountTx(proof: InnerProofData, noteStartIndex: number) {
    const tx = this.recoverAccountTx(proof);
    if (!tx.userId.equals(this.user.id)) {
      return;
    }

    const txHash = new TxHash(proof.txId);
    const savedTx = await this.db.getAccountTx(txHash);

    const accountId = new AccountId(tx.userId.publicKey, tx.userId.nonce);

    if (tx.newSigningPubKey1) {
      debug(`user ${this.user.id} adds signing key ${tx.newSigningPubKey1.toString('hex')}.`);
      await this.db.addUserSigningKey({
        accountId,
        address: this.user.publicKey,
        key: tx.newSigningPubKey1,
        treeIndex: noteStartIndex,
      });
    }

    if (tx.newSigningPubKey2) {
      debug(`user ${this.user.id} adds signing key ${tx.newSigningPubKey2.toString('hex')}.`);
      await this.db.addUserSigningKey({
        accountId,
        address: this.user.publicKey,
        key: tx.newSigningPubKey2,
        treeIndex: noteStartIndex + 1,
      });
    }

    if (savedTx) {
      await this.db.settleAccountTx(txHash);
    } else {
      await this.db.addAccountTx(tx);
    }

    this.emit(UserStateEvent.UPDATED_USER_STATE, this.user.id);
  }

  private async handleJoinSplitTx(proof: InnerProofData, noteStartIndex: number, viewingKeys: ViewingKey[]) {
    const txHash = new TxHash(proof.txId);
    const savedTx = await this.db.getJoinSplitTx(this.user.id, txHash);
    if (savedTx?.settled) {
      return;
    }

    const { newNote1, newNote2, nullifier1, nullifier2 } = proof;
    const newNote = await this.processNewNote(noteStartIndex, newNote1, viewingKeys[0]);
    const changeNote = await this.processNewNote(noteStartIndex + 1, newNote2, viewingKeys[1]);
    if (!newNote && !changeNote) {
      // Neither note was decrypted (change note should always belong to us).
      return;
    }

    const destroyedNote1 = await this.nullifyNote(nullifier1);
    const destroyedNote2 = await this.nullifyNote(nullifier2);

    await this.refreshNotePicker();

    if (savedTx) {
      await this.db.settleJoinSplitTx(txHash);
    } else {
      const tx = this.recoverJoinSplitTx(proof, newNote, changeNote, destroyedNote1, destroyedNote2);
      await this.db.addJoinSplitTx(tx);
    }
  }

  private async processNewNote(index: number, dataEntry: Buffer, viewingKey: ViewingKey) {
    if (viewingKey.isEmpty()) {
      return;
    }

    const savedNote = await this.db.getNote(index);
    if (savedNote) {
      return savedNote.owner.equals(this.user.id) ? savedNote : undefined;
    }

    const decryptedNote = decryptNote(viewingKey, this.user.privateKey, this.grumpkin);
    if (!decryptedNote) {
      return;
    }

    const { noteSecret, value, assetId, nonce } = decryptedNote;
    if (nonce !== this.user.id.nonce) {
      return;
    }

    const nullifier = this.noteAlgos.computeNoteNullifier(dataEntry, index, this.user.privateKey);
    const note: Note = {
      index,
      assetId,
      value,
      dataEntry,
      secret: noteSecret,
      viewingKey,
      nullifier,
      nullified: false,
      owner: this.user.id,
    };

    if (value) {
      await this.db.addNote(note);
      debug(`user ${this.user.id} successfully decrypted note at index ${index} with value ${value}.`);
    }

    return note;
  }

  private async nullifyNote(nullifier: Buffer) {
    const note = await this.db.getNoteByNullifier(nullifier);
    if (note?.owner.equals(this.user.id)) {
      await this.db.nullifyNote(note.index);
      debug(`user ${this.user.id} nullified note at index ${note.index} with value ${note.value}.`);
    }
    return note;
  }

  private recoverJoinSplitTx(
    proof: InnerProofData,
    newNote?: Note,
    changeNote?: Note,
    destroyedNote1?: Note,
    destroyedNote2?: Note,
  ): UserJoinSplitTx {
    const assetId = proof.assetId.readUInt32BE(28);

    const noteValue = (note?: Note) => (note ? note.value : BigInt(0));
    const privateInput = noteValue(destroyedNote1) + noteValue(destroyedNote2);
    const recipientPrivateOutput = noteValue(newNote);
    const senderPrivateOutput = noteValue(changeNote);

    const publicInput = toBigIntBE(proof.publicInput);
    const publicOutput = toBigIntBE(proof.publicOutput);

    const nonEmptyAddress = (address: Buffer) =>
      !address.equals(Buffer.alloc(address.length)) ? new EthAddress(address) : undefined;
    const inputOwner = nonEmptyAddress(proof.inputOwner);
    const outputOwner = nonEmptyAddress(proof.outputOwner);

    return {
      txHash: new TxHash(proof.txId),
      userId: this.user.id,
      assetId,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      inputOwner,
      outputOwner,
      ownedByUser: !!changeNote,
      settled: true,
      created: new Date(),
    };
  }

  private recoverAccountTx(proof: InnerProofData): UserAccountTx {
    const { txId, publicInput, publicOutput, assetId, inputOwner, outputOwner, nullifier1 } = proof;

    const txHash = new TxHash(txId);
    const publicKey = new GrumpkinAddress(Buffer.concat([publicInput, publicOutput]));
    const { aliasHash, nonce } = AccountAliasId.fromBuffer(assetId);
    const userId = new AccountId(publicKey, nonce);

    const nonEmptyKey = (address: Buffer) => (!address.equals(Buffer.alloc(32)) ? address : undefined);
    const newSigningPubKey1 = nonEmptyKey(inputOwner);
    const newSigningPubKey2 = nonEmptyKey(outputOwner);

    const accountAliasId = new AccountAliasId(aliasHash, nonce);
    const migrated = nonce !== 0 && nullifier1.equals(computeAccountAliasIdNullifier(accountAliasId, this.pedersen));

    return {
      txHash,
      userId,
      aliasHash,
      newSigningPubKey1,
      newSigningPubKey2,
      migrated,
      settled: true,
      created: new Date(),
    };
  }

  private async refreshNotePicker() {
    const notesMap: Map<AssetId, Note[]> = new Map();
    const notes = await this.db.getUserNotes(this.user.id);
    notes.forEach(note => {
      const assetNotes = notesMap.get(note.assetId) || [];
      notesMap.set(note.assetId, [...assetNotes, note]);
    });
    AssetIds.forEach(assetId => {
      const notePicker = new NotePicker(notesMap.get(assetId));
      this.notePickers.set(assetId, notePicker);
    });
  }

  public async pickNotes(assetId: AssetId, value: bigint) {
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return this.notePickers.get(assetId)?.pick(value, pendingNullifiers);
  }

  public async getMaxSpendableValue(assetId: AssetId) {
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return this.notePickers.get(assetId)?.getMaxSpendableValue(pendingNullifiers) || BigInt(0);
  }

  public getBalance(assetId: AssetId) {
    return this.notePickers.get(assetId)?.getSum() || BigInt(0);
  }

  public async addJoinSplitTx(tx: UserJoinSplitTx) {
    await this.db.addJoinSplitTx(tx);
    this.emit(UserStateEvent.UPDATED_USER_STATE, this.user.id);
  }

  public async addAccountTx(tx: UserAccountTx) {
    await this.db.addAccountTx(tx);
    this.emit(UserStateEvent.UPDATED_USER_STATE, this.user.id);
  }

  public async awaitSynchronised() {
    while (this.syncState === SyncState.SYNCHING) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export class UserStateFactory {
  constructor(
    private grumpkin: Grumpkin,
    private pedersen: Pedersen,
    private noteAlgos: NoteAlgorithms,
    private db: Database,
    private rollupProvider: RollupProvider,
  ) {}

  createUserState(user: UserData) {
    return new UserState(user, this.grumpkin, this.pedersen, this.noteAlgos, this.db, this.rollupProvider);
  }
}
