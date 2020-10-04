import { GrumpkinAddress } from 'barretenberg/address';
import { Block, BlockSource } from 'barretenberg/block_source';
import {
  computeNullifier,
  computeRemoveSigningKeyNullifier,
} from 'barretenberg/client_proofs/join_split_proof/compute_nullifier';
import { decryptNote } from 'barretenberg/client_proofs/note';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { MemoryFifo } from 'barretenberg/fifo';
import { InnerProofData, RollupProofData } from 'barretenberg/rollup_proof';
import { toBigIntBE } from 'bigint-buffer';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { Database } from '../database';
import { Note } from '../note';
import { NotePicker } from '../note_picker';
import { AssetId } from '../sdk';
import { UserData } from '../user';
import { UserTx, UserTxAction } from '../user_tx';

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
  private notePicker = new NotePicker();
  private blockQueue = new MemoryFifo<Block>();
  private syncState = SyncState.OFF;
  private syncingPromise!: Promise<void>;

  constructor(
    private user: UserData,
    private grumpkin: Grumpkin,
    private blake2s: Blake2s,
    private db: Database,
    private blockSource: BlockSource,
  ) {
    super();
  }

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
    debug(`starting sync for ${this.user.id.toString('hex')} from block ${this.user.syncedToBlock + 1}...`);
    this.syncState = SyncState.SYNCHING;
    const blocks = await this.blockSource.getBlocks(this.user.syncedToBlock + 1);
    for (const block of blocks) {
      if (!this.syncState) {
        return;
      }
      await this.handleBlock(block);
    }
    await this.db.updateUser(this.user);
    this.syncState = SyncState.MONITORING;
    this.syncingPromise = this.blockQueue.process(async block => this.handleBlock(block));
  }

  /**
   * Stops processing queued blocks. Blocks until any processing is complete.
   */
  public stopSync(flush = false) {
    if (!this.syncState) {
      return;
    }
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
    if (block.blockNum <= this.user.syncedToBlock) {
      return;
    }

    const balanceBefore = this.getBalance();

    const { rollupProofData, viewingKeysData } = block;
    const { rollupId, dataStartIndex, innerProofData } = RollupProofData.fromBuffer(rollupProofData, viewingKeysData);
    for (let i = 0; i < innerProofData.length; ++i) {
      const proof = innerProofData[i];
      const noteStartIndex = dataStartIndex + i * 2;

      switch (proof.proofId) {
        case 0:
          await this.handleJoinSplitTx(innerProofData[i], noteStartIndex);
          break;
        case 1:
          await this.handleAccountTx(innerProofData[i], noteStartIndex);
          break;
      }
    }

    this.user.syncedToBlock = block.blockNum;
    this.user.syncedToRollup = rollupId;
    await this.db.updateUser(this.user);

    const balanceAfter = this.getBalance();
    const diff = balanceAfter - balanceBefore;
    this.emit(UserStateEvent.UPDATED_USER_STATE, this.user.id, balanceAfter, diff, AssetId.DAI);

    return;
  }

  private async handleAccountTx(proof: InnerProofData, noteStartIndex: number) {
    const { id } = this.user;
    const txId = proof.getTxId();
    const savedUserTx = await this.db.getUserTx(id, txId);
    if (savedUserTx && savedUserTx.settled) {
      return;
    }

    const { publicInput, publicOutput, newNote1, newNote2, nullifier2 } = proof;
    const publicKey = new GrumpkinAddress(Buffer.concat([publicInput, publicOutput]));
    if (!publicKey.equals(this.user.publicKey)) {
      return;
    }

    const key1 = newNote1.slice(32);
    if (!key1.equals(Buffer.alloc(32))) {
      debug(`user ${this.user.id.toString('hex')} add signing key ${key1.toString('hex')}.`);
      await this.db.addUserSigningKey({ owner: this.user.id, key: key1, treeIndex: noteStartIndex });
    }

    const key2 = newNote2.slice(32);
    if (!key2.equals(Buffer.alloc(32))) {
      debug(`user ${this.user.id.toString('hex')} add signing key ${key2.toString('hex')}.`);
      await this.db.addUserSigningKey({ owner: this.user.id, key: key2, treeIndex: noteStartIndex + 1 });
    }

    const signingKeys = await this.db.getUserSigningKeys(this.user.id);
    const nullifiers = signingKeys.map(sk => computeRemoveSigningKeyNullifier(publicKey, sk.key, this.blake2s));
    const nullifyIndex = nullifiers.findIndex(n => nullifier2.equals(n));
    if (nullifyIndex >= 0) {
      debug(
        `user ${this.user.id.toString('hex')} removed signing key ${signingKeys[nullifyIndex].key.toString('hex')}.`,
      );
      await this.db.removeUserSigningKey(signingKeys[nullifyIndex]);
    }

    if (savedUserTx) {
      await this.db.settleUserTx(this.user.id, proof.getTxId());
    } else {
      const userTx = await this.recoverUserTx(proof);
      await this.db.addUserTx(userTx);
    }
  }

  private async handleJoinSplitTx(proof: InnerProofData, noteStartIndex: number) {
    const { id } = this.user;
    const txId = proof.getTxId();
    const savedUserTx = await this.db.getUserTx(id, txId);
    if (savedUserTx && savedUserTx.settled) {
      return;
    }

    const { newNote1, newNote2, nullifier1, nullifier2, viewingKeys } = proof;
    const newNote = await this.processNewNote(noteStartIndex, newNote1, viewingKeys[0]);
    const changeNote = await this.processNewNote(noteStartIndex + 1, newNote2, viewingKeys[1]);
    if (!newNote && !changeNote) {
      // Neither note was decrypted (change note should always belong to us).
      return;
    }

    const destroyedNote1 = await this.nullifyNote(nullifier1);
    const destroyedNote2 = await this.nullifyNote(nullifier2);

    if (savedUserTx) {
      await this.db.settleUserTx(id, txId);
    } else {
      const userTx = await this.recoverUserTx(proof, newNote, changeNote, destroyedNote1, destroyedNote2);
      await this.db.addUserTx(userTx);
    }

    await this.refreshNotePicker();
  }

  private async processNewNote(index: number, dataEntry: Buffer, viewingKey: Buffer) {
    const savedNote = await this.db.getNote(index);
    if (savedNote) {
      return savedNote.owner.equals(this.user.id) ? savedNote : undefined;
    }

    const decryptedNote = decryptNote(viewingKey, this.user.privateKey!, this.grumpkin);
    if (!decryptedNote) {
      return;
    }

    const { secret, value } = decryptedNote;
    const nullifier = computeNullifier(dataEntry, index, secret, this.blake2s);
    const note = {
      index,
      value,
      dataEntry,
      viewingKey: secret,
      encrypted: viewingKey,
      nullifier,
      nullified: false,
      owner: this.user.id,
    };
    if (value) {
      await this.db.addNote(note);
      debug(`user ${this.user.id.toString('hex')} successfully decrypted note at index ${index} with value ${value}.`);
    }
    return note;
  }

  private async nullifyNote(nullifier: Buffer) {
    const note = await this.db.getNoteByNullifier(this.user.id, nullifier);
    if (note) {
      await this.db.nullifyNote(note.index);
      debug(`user ${this.user.id.toString('hex')} nullified note at index ${note.index} with value ${note.value}.`);
    }
    return note;
  }

  private recoverUserTx(
    proof: InnerProofData,
    newNote?: Note,
    changeNote?: Note,
    destroyedNote1?: Note,
    destroyedNote2?: Note,
  ): UserTx {
    const createTx = (action: UserTxAction, value: bigint, recipient?: Buffer) => ({
      txHash: proof.getTxId(),
      action,
      value,
      recipient,
      userId: this.user.id,
      settled: true,
      created: new Date(),
    });

    if (proof.proofId === 1) {
      return createTx('ACCOUNT', BigInt(0), this.user.publicKey.toBuffer());
    }

    if (!changeNote) {
      return createTx('RECEIVE', newNote!.value, this.user.publicKey.toBuffer());
    }

    const publicInput = toBigIntBE(proof.publicInput);
    const publicOutput = toBigIntBE(proof.publicOutput);

    if (!publicInput && !publicOutput) {
      const value = destroyedNote1!.value + (destroyedNote2 ? destroyedNote2.value : BigInt(0)) - changeNote.value;
      return createTx('TRANSFER', value, newNote ? this.user.publicKey.toBuffer() : undefined);
    }

    if (publicInput === publicOutput) {
      return createTx('PUBLIC_TRANSFER', publicInput, proof.outputOwner.toBuffer());
    }

    if (publicInput > publicOutput) {
      return createTx('DEPOSIT', publicInput, this.user.publicKey.toBuffer());
    }

    return createTx('WITHDRAW', publicOutput, proof.outputOwner.toBuffer());
  }

  private async refreshNotePicker() {
    const notes = await this.db.getUserNotes(this.user.id);
    this.notePicker = new NotePicker();
    this.notePicker.addNotes(notes);
  }

  public pickNotes(value: bigint) {
    return this.notePicker.pick(value);
  }

  public getBalance() {
    return this.notePicker.getNoteSum();
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
    private blake2s: Blake2s,
    private db: Database,
    private blockSource: BlockSource,
  ) {}

  createUserState(user: UserData) {
    return new UserState(user, this.grumpkin, this.blake2s, this.db, this.blockSource);
  }
}
