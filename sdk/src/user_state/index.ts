import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetId, AssetIds } from '@aztec/barretenberg/asset';
import { Block } from '@aztec/barretenberg/block_source';
import { AccountAliasId, AccountId, ProofId, recoverTreeNotes, TreeNote } from '@aztec/barretenberg/client_proofs';
import { computeAccountAliasIdNullifier } from '@aztec/barretenberg/client_proofs/account_proof';
import { batchDecryptNotes, DecryptedNote, NoteAlgorithms } from '@aztec/barretenberg/client_proofs/note_algorithms';
import { Pedersen } from '@aztec/barretenberg/crypto/pedersen';
import { Grumpkin } from '@aztec/barretenberg/ecc/grumpkin';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { toBigIntBE } from 'bigint-buffer';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { Database } from '../database';
import { Note } from '../note';
import { NotePicker } from '../note_picker';
import { UserData } from '../user';
import { isJoinSplitTx, UserAccountTx, UserJoinSplitTx } from '../user_tx';

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
  private notePickers: NotePicker[] = [];
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

  /**
   * Load/refresh user state.
   */
  public async init() {
    this.user = (await this.db.getUser(this.user.id))!;
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
    const start = new Date().getTime();
    debug(`starting sync for ${this.user.id} from rollup block ${this.user.syncedToRollup + 1}...`);
    this.syncState = SyncState.SYNCHING;
    const blocks = await this.rollupProvider.getBlocks(this.user.syncedToRollup + 1);
    await this.handleBlocks(blocks);
    debug(`sync complete in ${new Date().getTime() - start}ms.`);
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

  public async handleBlocks(blocks: Block[]) {
    blocks = blocks.filter(b => b.rollupId > this.user.syncedToRollup);
    if (blocks.length == 0) {
      return;
    }

    const balancesBefore = AssetIds.map(assetId => this.getBalance(assetId));

    const viewingKeys = Buffer.concat(blocks.map(b => b.viewingKeysData));
    const decryptedNotes = await batchDecryptNotes(viewingKeys, this.user.privateKey, this.noteAlgos, this.grumpkin);

    const rollupProofData = blocks.map(b => RollupProofData.fromBuffer(b.rollupProofData, b.viewingKeysData));
    const proofsWithDecryptedNotes = rollupProofData
      .map(p => p.innerProofData.filter(i => !i.isPadding()))
      .flat()
      .filter(p => [ProofId.JOIN_SPLIT].includes(p.proofId));

    const noteCommitments: Buffer[] = [];
    const decryptedTreeNote: (DecryptedNote | undefined)[] = [];
    proofsWithDecryptedNotes.forEach(({ newNote1, newNote2 }, i) => {
      noteCommitments.push(newNote1);
      noteCommitments.push(newNote2);
      decryptedTreeNote.push(...decryptedNotes.slice(i * 2, i * 2 + 2));
    });
    const notes = recoverTreeNotes(
      decryptedTreeNote,
      noteCommitments,
      this.user.privateKey,
      this.grumpkin,
      this.noteAlgos,
    );

    let jsCount = 0;
    for (let blockIndex = 0; blockIndex < blocks.length; ++blockIndex) {
      const block = blocks[blockIndex];
      const proofData = rollupProofData[blockIndex];

      for (let i = 0; i < proofData.innerProofData.length; ++i) {
        const proof = proofData.innerProofData[i];
        if (proof.isPadding()) {
          continue;
        }

        const noteStartIndex = proofData.dataStartIndex + i * 2;

        if (proof.proofId === 0) {
          const [note1, note2] = notes.slice(jsCount * 2, jsCount * 2 + 2);
          ++jsCount;
          if (!note1 && !note2) {
            continue;
          }
          await this.handleJoinSplitTx(proof, noteStartIndex, block.created, note1, note2);
        }

        if (proof.proofId === 1) {
          await this.handleAccountTx(proof, noteStartIndex, block.created);
        }
      }

      this.user = { ...this.user, syncedToRollup: proofData.rollupId };
    }

    await this.db.updateUser(this.user);

    AssetIds.forEach((assetId, i) => {
      const balanceAfter = this.getBalance(assetId);
      const diff = balanceAfter - balancesBefore[i];
      if (diff) {
        this.emit(UserStateEvent.UPDATED_USER_STATE, this.user.id, balanceAfter, diff, assetId);
      }
    });

    this.emit(UserStateEvent.UPDATED_USER_STATE, this.user.id);
  }

  private async handleAccountTx(proof: InnerProofData, noteStartIndex: number, blockCreated: Date) {
    const tx = this.recoverAccountTx(proof, blockCreated);
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
        key: tx.newSigningPubKey1,
        treeIndex: noteStartIndex,
      });
    }

    if (tx.newSigningPubKey2) {
      debug(`user ${this.user.id} adds signing key ${tx.newSigningPubKey2.toString('hex')}.`);
      await this.db.addUserSigningKey({
        accountId,
        key: tx.newSigningPubKey2,
        treeIndex: noteStartIndex + 1,
      });
    }

    if (!this.user.aliasHash || !this.user.aliasHash.equals(tx.aliasHash)) {
      debug(`user ${this.user.id} updates alias hash ${tx.aliasHash.toString()}.`);
      this.user = { ...this.user, aliasHash: tx.aliasHash };
      await this.db.updateUser(this.user);
    }

    if (savedTx) {
      await this.db.settleAccountTx(txHash, blockCreated);
    } else {
      await this.db.addAccountTx(tx);
    }
  }

  private async handleJoinSplitTx(
    proof: InnerProofData,
    noteStartIndex: number,
    blockCreated: Date,
    note1?: TreeNote,
    note2?: TreeNote,
  ) {
    const txHash = new TxHash(proof.txId);
    const savedTx = await this.db.getJoinSplitTx(this.user.id, txHash);
    if (savedTx?.settled) {
      return;
    }

    const { newNote1, newNote2, nullifier1, nullifier2 } = proof;
    const newNote = await this.processNewNote(noteStartIndex, newNote1, note1);
    const changeNote = await this.processNewNote(noteStartIndex + 1, newNote2, note2);
    if (!newNote && !changeNote) {
      // Neither note was decrypted (change note should always belong to us for txs we created).
      return;
    }

    const destroyedNote1 = await this.nullifyNote(nullifier1);
    const destroyedNote2 = await this.nullifyNote(nullifier2);

    await this.refreshNotePicker();

    if (savedTx) {
      debug(`settling tx: ${savedTx.txHash.toString()}`);
      await this.db.settleJoinSplitTx(txHash, blockCreated);
    } else {
      const tx = this.recoverJoinSplitTx(proof, blockCreated, newNote, changeNote, destroyedNote1, destroyedNote2);
      debug(`recovered tx: ${tx.txHash.toString()}`);
      await this.db.addJoinSplitTx(tx);
    }
  }

  private async processNewNote(index: number, dataEntry: Buffer, treeNote?: TreeNote) {
    if (!treeNote) {
      return;
    }

    const savedNote = await this.db.getNote(index);
    if (savedNote) {
      return savedNote.owner.equals(this.user.id) ? savedNote : undefined;
    }

    const { noteSecret, value, assetId, nonce } = treeNote;
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
    blockCreated: Date,
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
      created: new Date(),
      settled: blockCreated,
    };
  }

  private recoverAccountTx(proof: InnerProofData, blockCreated: Date): UserAccountTx {
    const { txId, publicInput, publicOutput, assetId, inputOwner, outputOwner, nullifier1 } = proof;

    const txHash = new TxHash(txId);
    const publicKey = new GrumpkinAddress(Buffer.concat([publicInput, publicOutput]));
    const accountAliasId = AccountAliasId.fromBuffer(assetId);
    const { aliasHash, nonce } = accountAliasId;
    const userId = new AccountId(publicKey, nonce);

    const nonEmptyKey = (address: Buffer) => (!address.equals(Buffer.alloc(32)) ? address : undefined);
    const newSigningPubKey1 = nonEmptyKey(inputOwner);
    const newSigningPubKey2 = nonEmptyKey(outputOwner);

    const migrated = nonce !== 0 && nullifier1.equals(computeAccountAliasIdNullifier(accountAliasId, this.pedersen));

    return {
      txHash,
      userId,
      aliasHash,
      newSigningPubKey1,
      newSigningPubKey2,
      migrated,
      created: new Date(),
      settled: blockCreated,
    };
  }

  private async refreshNotePicker() {
    const notesMap: Note[][] = Array(AssetIds.length)
      .fill(0)
      .map(() => []);
    const notes = await this.db.getUserNotes(this.user.id);
    notes.forEach(note => notesMap[note.assetId].push(note));
    this.notePickers = AssetIds.map(assetId => new NotePicker(notesMap[assetId]));
  }

  public async pickNotes(assetId: AssetId, value: bigint) {
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return this.notePickers[assetId].pick(value, pendingNullifiers);
  }

  public async getSpendableNotes(assetId: AssetId) {
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return this.notePickers[assetId].getSpendableNotes(pendingNullifiers).notes;
  }

  public async getSpendableSum(assetId: AssetId) {
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return this.notePickers[assetId].getSpendableSum(pendingNullifiers);
  }

  public async getMaxSpendableValue(assetId: AssetId) {
    const pendingNullifiers = await this.rollupProvider.getPendingNoteNullifiers();
    return this.notePickers[assetId].getMaxSpendableValue(pendingNullifiers);
  }

  public getBalance(assetId: AssetId) {
    return this.notePickers[assetId].getSum();
  }

  public async addTx(tx: UserJoinSplitTx | UserAccountTx) {
    if (isJoinSplitTx(tx)) {
      debug(`adding join split tx: ${tx.txHash}`);
      await this.db.addJoinSplitTx(tx);
    } else {
      debug(`adding account tx: ${tx.txHash}`);
      await this.db.addAccountTx(tx);
    }
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
