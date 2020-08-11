import { Block } from 'barretenberg/block_source';
import { computeNullifier } from 'barretenberg/client_proofs/join_split_proof/compute_nullifier';
import { decryptNote } from 'barretenberg/client_proofs/note';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import createDebug from 'debug';
import { Database } from '../database';
import { Note } from '../note';
import { NotePicker } from '../note_picker';
import { User } from '../user';
import { UserTx } from '../user_tx';

const debug = createDebug('bb:user_state');

export class UserState {
  private notePicker!: NotePicker;

  constructor(private user: User, private grumpkin: Grumpkin, private blake2s: Blake2s, private db: Database) {}

  public async init() {
    await this.refreshNotePicker();
  }

  public getUser() {
    return this.user;
  }

  public async processBlock(block: Block) {
    let updated = false;

    const userNotes = await this.db.getUserNotes(this.user.id);

    for (let i = 0; i < block.dataEntries.length; ++i) {
      const dataEntry = block.dataEntries[i];
      const encryptedNote = block.viewingKeys[i];
      const treeIndex = block.dataStartIndex + i;

      if (userNotes.find(n => n.index === treeIndex)) {
        updated = true;
        continue;
      }

      const decryptedNote = decryptNote(encryptedNote, this.user.privateKey!, this.grumpkin);
      if (!decryptedNote) {
        continue;
      }
      debug(
        `user ${this.user.id} successfully decrypted note at index ${treeIndex} with value ${decryptedNote.value}.`,
      );

      const { secret, value } = decryptedNote;
      const nullifier = computeNullifier(dataEntry, treeIndex, secret, this.blake2s);
      const note = {
        index: treeIndex,
        value,
        dataEntry,
        viewingKey: secret,
        encrypted: encryptedNote,
        nullifier,
        nullified: false,
        owner: this.user.id,
      };
      if (value) {
        await this.db.addNote(note);
      }
      await this.addReceivedTxIfNotOurs(note);
      updated = true;
    }

    for (const nullifier of block.nullifiers) {
      const note = await this.db.getNoteByNullifier(this.user.id, nullifier);
      if (!note) {
        continue;
      }
      await this.db.nullifyNote(note.index);
      debug(`user ${this.user.id} nullified note at index ${note.index} with value ${note.value}.`);
      await this.settleTxForNote(note);
      updated = true;
    }

    await this.refreshNotePicker();

    return updated;
  }

  private async addReceivedTxIfNotOurs(note: Note) {
    const dataEntry = Buffer.from(note.dataEntry);
    const userTxs = await this.db.getUserTxs(this.user.id);
    let userTx = userTxs.find(
      tx =>
        (tx.outputNote1 && dataEntry.equals(Buffer.from(tx.outputNote1))) ||
        (tx.outputNote2 && dataEntry.equals(Buffer.from(tx.outputNote2))),
    );
    if (userTx) {
      await this.db.settleUserTx(userTx.txHash);
    } else {
      // No tx associated with this note. Add a new 'received' tx.
      await this.db.addUserTx({
        // TODO - find real txId or allow it to be empty in database.
        txHash: dataEntry.slice(0, 32),
        userId: this.user.id,
        action: 'RECEIVE',
        value: note.value,
        recipient: this.user.publicKey,
        settled: true,
        created: new Date(),
        outputNote1: dataEntry,
      });
    }
  }

  private async settleTxForNote(note: Note) {
    const userTxs = await this.db.getUserTxs(this.user.id);
    let userTx = userTxs.find(tx => tx.inputNote1 === note.index || tx.inputNote2 === note.index);
    if (userTx && !userTx.settled) {
      await this.db.settleUserTx(userTx.txHash);
    }
  }

  public async refreshNotePicker() {
    const notes = await this.db.getUserNotes(this.user.id);
    this.notePicker = new NotePicker();
    this.notePicker.addNotes(notes);
  }

  public pickNotes(value: number) {
    return this.notePicker.pick(value);
  }

  public getBalance() {
    return this.notePicker.getNoteSum();
  }

  public async addUserTx(userTx: UserTx) {
    await this.db.addUserTx(userTx);
  }

  public async removeUserTx(txHash: Buffer) {
    await this.db.deleteUserTx(txHash);
  }

  public async getUserTx(txHash: Buffer) {
    return this.db.getUserTx(txHash);
  }

  public async getUserTxs() {
    return this.db.getUserTxs(this.user.id);
  }
}

export class UserStateFactory {
  constructor(private grumpkin: Grumpkin, private blake2s: Blake2s, private db: Database) {}

  createUserState(user: User) {
    return new UserState(user, this.grumpkin, this.blake2s, this.db);
  }
}
