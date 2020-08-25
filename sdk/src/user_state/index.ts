import { Block, BlockSource } from 'barretenberg/block_source';
import { computeNullifier } from 'barretenberg/client_proofs/join_split_proof/compute_nullifier';
import { decryptNote } from 'barretenberg/client_proofs/note';
import { RollupProofData, InnerProofData } from 'barretenberg/rollup_proof';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { toBigIntBE } from 'bigint-buffer';
import createDebug from 'debug';
import { Database } from '../database';
import { Note } from '../note';
import { NotePicker } from '../note_picker';
import { UserTx, UserTxAction } from '../user_tx';
import { EventEmitter } from 'events';
import { MemoryFifo } from 'barretenberg/fifo';
import { UserData } from '../user';
import { AssetId } from '../sdk';

const debug = createDebug('bb:user_state');

export enum UserStateEvent {
  UPDATED_USER_STATE = 'UPDATED_USER_STATE',
}

export class UserState extends EventEmitter {
  private notePicker = new NotePicker();
  private blockQueue = new MemoryFifo<Block>();
  private syncing = false;
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
    this.user = (await this.db.getUser(this.user.ethAddress))!;
    await this.refreshNotePicker();
  }

  /**
   * First handles all historical blocks.
   * Then starts processing blocks added to queue via `processBlock()`.
   */
  public async startSync() {
    debug(`starting sync for ${this.user.ethAddress} from block ${this.user.syncedToBlock + 1}...`);
    this.syncing = true;
    const blocks = await this.blockSource.getBlocks(this.user.syncedToBlock + 1);
    for (const block of blocks) {
      if (!this.syncing) {
        return;
      }
      await this.handleBlock(block);
    }
    await this.db.updateUser(this.user);
    this.syncingPromise = this.blockQueue.process(async block => this.handleBlock(block));
  }

  /**
   * Stops processing queued blocks. Blocks until any processing is complete.
   */
  public stopSync(flush = false) {
    if (!this.syncing) {
      return;
    }
    flush ? this.blockQueue.end() : this.blockQueue.cancel();
    this.syncing = false;
    return this.syncingPromise;
  }

  public isSyncing() {
    return this.syncing;
  }

  public getUser() {
    return this.user;
  }

  public processBlock(block: Block) {
    this.blockQueue.put(block);
  }

  private async handleBlock(block: Block) {
    if (block.blockNum < this.user.syncedToBlock) {
      return;
    }

    const { ethAddress } = this.user;
    const balanceBefore = this.getBalance();

    const { rollupProofData, viewingKeysData } = block;
    const { rollupId, dataStartIndex, innerProofData } = RollupProofData.fromBuffer(rollupProofData, viewingKeysData);
    for (let i = 0; i < innerProofData.length; ++i) {
      const proof = innerProofData[i];
      const txId = proof.getTxId();
      const savedUserTx = await this.db.getUserTx(ethAddress, txId);
      if (savedUserTx && savedUserTx.settled) {
        continue;
      }

      const { newNote1, newNote2, nullifier1, nullifier2, viewingKeys } = proof;
      const noteStartIndex = dataStartIndex + i * 2;
      const newNote = await this.processNewNote(noteStartIndex, newNote1, viewingKeys[0]);
      const changeNote = await this.processNewNote(noteStartIndex + 1, newNote2, viewingKeys[1]);
      if (!newNote && !changeNote) {
        // Neither note was decrypted (change note should always belong to us).
        continue;
      }

      const destroyedNote1 = await this.nullifyNote(nullifier1);
      const destroyedNote2 = await this.nullifyNote(nullifier2);

      await this.refreshNotePicker();

      if (savedUserTx) {
        await this.db.settleUserTx(ethAddress, txId);
      } else {
        const userTx = await this.recoverUserTx(proof, newNote, changeNote, destroyedNote1, destroyedNote2);
        await this.db.addUserTx(userTx);
      }
    }

    this.user.syncedToBlock = block.blockNum;
    this.user.syncedToRollup = rollupId;
    await this.db.updateUser(this.user);

    const balanceAfter = this.getBalance();
    const diff = balanceAfter - balanceBefore;
    this.emit(UserStateEvent.UPDATED_USER_STATE, ethAddress, balanceAfter, diff, AssetId.DAI);

    return;
  }

  private async processNewNote(index: number, dataEntry: Buffer, viewingKey: Buffer) {
    const savedNote = await this.db.getNote(index);
    if (savedNote) {
      return savedNote.owner.equals(this.user.ethAddress) ? savedNote : undefined;
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
      owner: this.user.ethAddress,
    };
    if (value) {
      await this.db.addNote(note);
      debug(`user ${this.user.ethAddress} successfully decrypted note at index ${index} with value ${value}.`);
    }
    return note;
  }

  private async nullifyNote(nullifier: Buffer) {
    const note = await this.db.getNoteByNullifier(this.user.ethAddress, nullifier);
    if (note) {
      await this.db.nullifyNote(note.index);
      debug(`user ${this.user.ethAddress} nullified note at index ${note.index} with value ${note.value}.`);
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
      ethAddress: this.user.ethAddress,
      settled: true,
      created: new Date(),
    });

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
      return createTx('PUBLIC_TRANSFER', publicInput, proof.outputOwner);
    }

    if (publicInput > publicOutput) {
      return createTx('DEPOSIT', publicInput, this.user.publicKey.toBuffer());
    }

    return createTx('WITHDRAW', publicOutput, proof.outputOwner);
  }

  private async refreshNotePicker() {
    const notes = await this.db.getUserNotes(this.user.ethAddress);
    this.notePicker = new NotePicker();
    this.notePicker.addNotes(notes);
  }

  public pickNotes(value: bigint) {
    return this.notePicker.pick(value);
  }

  public getBalance() {
    return this.notePicker.getNoteSum();
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
