import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId, AssetIds } from '@aztec/barretenberg/asset';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { Block } from '@aztec/barretenberg/block_source';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import {
  batchDecryptNotes,
  DefiInteractionNote,
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
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { Database } from '../database';
import { Note } from '../note';
import { NotePicker } from '../note_picker';
import { UserData } from '../user';
import { UserAccountTx, UserDefiTx, UserJoinSplitTx } from '../user_tx';

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

    const rollupProofData = blocks.map(b => RollupProofData.fromBuffer(b.rollupProofData));
    const innerProofs = rollupProofData.map(p => p.innerProofData.filter(i => !i.isPadding())).flat();
    const offchainTxDataBuffers = blocks.map(b => b.offchainTxData).flat();
    const viewingKeys: ViewingKey[] = [];
    const noteCommitments: Buffer[] = [];
    const offchainAccountData: OffchainAccountData[] = [];
    const offchainDefiDepositData: OffchainDefiDepositData[] = [];
    innerProofs.forEach((proof, i) => {
      switch (proof.proofId) {
        case ProofId.JOIN_SPLIT: {
          const offchainTxData = OffchainJoinSplitData.fromBuffer(offchainTxDataBuffers[i]);
          viewingKeys.push(...offchainTxData.viewingKeys);
          const { noteCommitment1, noteCommitment2 } = innerProofs[i];
          noteCommitments.push(noteCommitment1);
          noteCommitments.push(noteCommitment2);
          break;
        }
        case ProofId.ACCOUNT: {
          offchainAccountData.push(OffchainAccountData.fromBuffer(offchainTxDataBuffers[i]));
          break;
        }
        case ProofId.DEFI_DEPOSIT: {
          const offchainTxData = OffchainDefiDepositData.fromBuffer(offchainTxDataBuffers[i]);
          viewingKeys.push(offchainTxData.viewingKey);
          const { noteCommitment2 } = innerProofs[i];
          noteCommitments.push(noteCommitment2);
          offchainDefiDepositData.push(offchainTxData);
          break;
        }
      }
    });

    const viewingKeysBuf = Buffer.concat(viewingKeys.flat().map(vk => vk.toBuffer()));
    const decryptedTreeNote = await batchDecryptNotes(
      viewingKeysBuf,
      this.user.privateKey,
      this.noteAlgos,
      this.grumpkin,
    );
    const treeNotes = recoverTreeNotes(
      decryptedTreeNote,
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
          case ProofId.JOIN_SPLIT: {
            const [note1, note2] = treeNotes.slice(treeNoteStartIndex, treeNoteStartIndex + 2);
            treeNoteStartIndex += 2;
            if (!note1 && !note2) {
              continue;
            }
            await this.handleJoinSplitTx(proof, noteStartIndex, block.created, note1, note2);
            break;
          }
          case ProofId.ACCOUNT: {
            const [offchainTxData] = offchainAccountData.splice(0, 1);
            await this.handleAccountTx(proof, offchainTxData, noteStartIndex, block.created);
            break;
          }
          case ProofId.DEFI_DEPOSIT: {
            const note = treeNotes[treeNoteStartIndex];
            treeNoteStartIndex++;
            if (!note) {
              // Both notes should be owned by the same user.
              continue;
            }
            const [offchainTxData] = offchainDefiDepositData.splice(0, 1);
            await this.handleDefiDepositTx(proof, offchainTxData, noteStartIndex, block.interactionResult, note);
            break;
          }
          case ProofId.DEFI_CLAIM:
            await this.handleDefiClaimTx(proof, noteStartIndex, block.created);
            break;
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

    const { txHash, userId, newSigningPubKey1, newSigningPubKey2, aliasHash } = tx;

    if (newSigningPubKey1) {
      debug(`user ${this.user.id} adds signing key ${newSigningPubKey1.toString('hex')}.`);
      await this.db.addUserSigningKey({
        accountId: userId,
        key: newSigningPubKey1,
        treeIndex: noteStartIndex,
      });
    }

    if (newSigningPubKey2) {
      debug(`user ${this.user.id} adds signing key ${newSigningPubKey2.toString('hex')}.`);
      await this.db.addUserSigningKey({
        accountId: userId,
        key: newSigningPubKey2,
        treeIndex: noteStartIndex + 1,
      });
    }

    if (!this.user.aliasHash || !this.user.aliasHash.equals(aliasHash)) {
      debug(`user ${this.user.id} updates alias hash ${aliasHash.toString()}.`);
      this.user = { ...this.user, aliasHash };
      await this.db.updateUser(this.user);
    }

    const savedTx = await this.db.getAccountTx(txHash);
    if (savedTx) {
      debug(`settling account tx: ${txHash.toString()}`);
      await this.db.settleAccountTx(txHash, blockCreated);
    } else {
      debug(`recovered account tx: ${txHash.toString()}`);
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
    const { noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = proof;
    const noteCommitment = await this.processNewNote(noteStartIndex, noteCommitment1, note1);
    const changeNote = await this.processNewNote(noteStartIndex + 1, noteCommitment2, note2);
    if (!noteCommitment && !changeNote) {
      // Neither note was decrypted (change note should always belong to us for txs we created).
      return;
    }

    const destroyedNote1 = await this.nullifyNote(nullifier1);
    const destroyedNote2 = await this.nullifyNote(nullifier2);

    await this.refreshNotePicker();

    const txHash = new TxHash(proof.txId);
    const savedTx = await this.db.getJoinSplitTx(txHash, this.user.id);
    if (savedTx) {
      debug(`settling tx: ${savedTx.txHash.toString()}`);
      await this.db.settleJoinSplitTx(txHash, this.user.id, blockCreated);
    } else {
      const tx = this.recoverJoinSplitTx(
        proof,
        blockCreated,
        noteCommitment,
        changeNote,
        destroyedNote1,
        destroyedNote2,
      );
      debug(`recovered tx: ${tx.txHash.toString()}`);
      await this.db.addJoinSplitTx(tx);
    }
  }

  private async handleDefiDepositTx(
    proof: InnerProofData,
    offchainTxData: OffchainDefiDepositData,
    noteStartIndex: number,
    interactionResult: DefiInteractionNote[],
    treeNote: TreeNote,
  ) {
    const { txId, noteCommitment1, noteCommitment2 } = proof;
    const noteCommitment = await this.processNewNote(noteStartIndex + 1, noteCommitment2, treeNote);
    if (!noteCommitment) {
      // Owned by the account with a different nonce.
      return;
    }

    const { bridgeId, depositValue } = offchainTxData;
    const txHash = new TxHash(txId);
    const { totalInputValue, totalOutputValueA, totalOutputValueB, result } = interactionResult.find(r =>
      r.bridgeId.equals(bridgeId),
    )!;
    const outputValueA = !result ? BigInt(0) : (totalOutputValueA * depositValue) / totalInputValue;
    const outputValueB = !result ? BigInt(0) : (totalOutputValueB * depositValue) / totalInputValue;
    await this.addClaim(noteStartIndex, txHash, noteCommitment1, treeNote.noteSecret);
    const { nullifier1, nullifier2 } = proof;
    const destroyedNote1 = await this.nullifyNote(nullifier1);
    const destroyedNote2 = await this.nullifyNote(nullifier2);

    await this.refreshNotePicker();

    const savedTx = await this.db.getDefiTx(txHash);
    if (savedTx) {
      debug(`settling defi tx: ${txHash.toString()}`);
      await this.db.updateDefiTx(txHash, outputValueA, outputValueB);
    } else {
      const tx = this.recoverDefiTx(
        proof,
        offchainTxData,
        outputValueA,
        outputValueB,
        noteCommitment,
        destroyedNote1,
        destroyedNote2,
      );
      debug(`recovered defi tx: ${txHash.toString()}`);
      await this.db.addDefiTx(tx);
    }
  }

  private async handleDefiClaimTx(proof: InnerProofData, noteStartIndex: number, blockCreated: Date) {
    const { nullifier1 } = proof;
    const claim = await this.db.getClaim(nullifier1);
    if (!claim?.owner.equals(this.user.id)) {
      return;
    }

    const { txHash, secret, owner } = claim;
    const { noteCommitment1, noteCommitment2 } = proof;
    const { bridgeId, depositValue, outputValueA, outputValueB } = (await this.db.getDefiTx(txHash))!;
    // When generating output notes, set creatorPubKey to 0 (it's a DeFi txn, recipient of note is same as creator of claim note)
    if (!outputValueA && !outputValueB) {
      const treeNote = new TreeNote(owner.publicKey, depositValue, bridgeId.inputAssetId, owner.nonce, secret, Buffer.alloc(32));
      await this.processNewNote(noteStartIndex, noteCommitment1, treeNote);
    }
    if (outputValueA) {
      const treeNote = new TreeNote(owner.publicKey, outputValueA, bridgeId.outputAssetIdA, owner.nonce, secret, Buffer.alloc(32));
      await this.processNewNote(noteStartIndex, noteCommitment1, treeNote);
    }
    if (outputValueB) {
      const treeNote = new TreeNote(owner.publicKey, outputValueB, bridgeId.outputAssetIdB, owner.nonce, secret, Buffer.alloc(32));
      await this.processNewNote(noteStartIndex + 1, noteCommitment2, treeNote);
    }

    await this.refreshNotePicker();

    await this.db.settleDefiTx(txHash, blockCreated);
  }

  private async processNewNote(index: number, dataEntry: Buffer, treeNote?: TreeNote) {
    if (!treeNote) {
      return;
    }

    const savedNote = await this.db.getNote(index);
    if (savedNote) {
      return savedNote.owner.equals(this.user.id) ? savedNote : undefined;
    }

    const { noteSecret, value, assetId, nonce, creatorPubKey } = treeNote;
    if (nonce !== this.user.id.nonce) {
      return;
    }

    const nullifier = this.noteAlgos.valueNoteNullifier(dataEntry, index, this.user.privateKey);
    const note: Note = {
      index,
      assetId,
      value,
      dataEntry,
      secret: noteSecret,
      nullifier,
      nullified: false,
      owner: this.user.id,
      creatorPubKey,
    };

    if (value) {
      await this.db.addNote(note);
      debug(`user ${this.user.id} successfully decrypted note at index ${index} with value ${value}.`);
    }

    return note;
  }

  private async nullifyNote(nullifier: Buffer) {
    const note = await this.db.getNoteByNullifier(nullifier);
    if (!note || !note.owner.equals(this.user.id)) {
      return;
    }
    await this.db.nullifyNote(note.index);
    debug(`user ${this.user.id} nullified note at index ${note.index} with value ${note.value}.`);
    return note;
  }

  private async addClaim(index: number, txHash: TxHash, dataEntry: Buffer, noteSecret: Buffer) {
    const nullifier = this.noteAlgos.claimNoteNullifier(dataEntry, index);
    await this.db.addClaim({
      txHash,
      secret: noteSecret,
      nullifier,
      owner: this.user.id,
    });
    debug(`user ${this.user.id} successfully decrypted claim note at index ${index}.`);
  }

  private recoverJoinSplitTx(
    proof: InnerProofData,
    blockCreated: Date,
    noteCommitment?: Note,
    changeNote?: Note,
    destroyedNote1?: Note,
    destroyedNote2?: Note,
  ) {
    const assetId = proof.assetId.readUInt32BE(28);

    const noteValue = (note?: Note) => (note ? note.value : BigInt(0));
    const privateInput = noteValue(destroyedNote1) + noteValue(destroyedNote2);
    const recipientPrivateOutput = noteValue(noteCommitment);
    const senderPrivateOutput = noteValue(changeNote);

    const publicInput = toBigIntBE(proof.publicInput);
    const publicOutput = toBigIntBE(proof.publicOutput);

    const nonEmptyAddress = (address: Buffer) =>
      !address.equals(Buffer.alloc(address.length)) ? new EthAddress(address) : undefined;
    const inputOwner = nonEmptyAddress(proof.inputOwner);
    const outputOwner = nonEmptyAddress(proof.outputOwner);

    return new UserJoinSplitTx(
      new TxHash(proof.txId),
      this.user.id,
      assetId,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      inputOwner,
      outputOwner,
      !!changeNote,
      new Date(),
      blockCreated,
    );
  }

  private recoverAccountTx(proof: InnerProofData, offchainTxData: OffchainAccountData, blockCreated: Date) {
    const { txId, nullifier1 } = proof;
    const { accountPublicKey, accountAliasId, spendingPublicKey1, spendingPublicKey2 } = offchainTxData;
    const txHash = new TxHash(txId);
    const userId = new AccountId(accountPublicKey, accountAliasId.nonce);
    const migrated = !!toBigIntBE(nullifier1);

    return new UserAccountTx(
      txHash,
      userId,
      accountAliasId.aliasHash,
      spendingPublicKey1,
      spendingPublicKey2,
      migrated,
      new Date(),
      blockCreated,
    );
  }

  private recoverDefiTx(
    proof: InnerProofData,
    offchainTxData: OffchainDefiDepositData,
    outputValueA: bigint,
    outputValueB: bigint,
    noteCommitment?: Note,
    destroyedNote1?: Note,
    destroyedNote2?: Note,
  ) {
    const { txId } = proof;
    const { bridgeId, depositValue } = offchainTxData;
    const txHash = new TxHash(txId);

    const noteValue = (note?: Note) => (note ? note.value : BigInt(0));
    const privateInput = noteValue(destroyedNote1) + noteValue(destroyedNote2);
    const privateOutput = noteValue(noteCommitment);
    const txFee = privateInput - privateOutput - depositValue;

    return new UserDefiTx(txHash, this.user.id, bridgeId, depositValue, txFee, new Date(), outputValueA, outputValueB);
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

  public async addTx(tx: UserJoinSplitTx | UserAccountTx | UserDefiTx) {
    switch (tx.proofId) {
      case ProofId.JOIN_SPLIT:
        debug(`adding join split tx: ${tx.txHash}`);
        await this.db.addJoinSplitTx(tx);
        break;
      case ProofId.ACCOUNT:
        debug(`adding account tx: ${tx.txHash}`);
        await this.db.addAccountTx(tx);
        break;
      case ProofId.DEFI_DEPOSIT:
        debug(`adding defi tx: ${tx.txHash}`);
        await this.db.addDefiTx(tx);
        break;
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
    private noteAlgos: NoteAlgorithms,
    private db: Database,
    private rollupProvider: RollupProvider,
  ) {}

  createUserState(user: UserData) {
    return new UserState(user, this.grumpkin, this.noteAlgos, this.db, this.rollupProvider);
  }
}
