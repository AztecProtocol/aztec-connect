import { Block } from 'barretenberg-es/block_source';
import { decryptNote, Note } from 'barretenberg-es/client_proofs/note';
import createDebug from 'debug';
import { Blake2s } from 'barretenberg-es/crypto/blake2s';
import { NotePicker, TrackedNote } from '../note_picker';
import { Database, DbNote, DbUserTx, UserTxAction } from '../database';
import { Grumpkin } from 'barretenberg-es/ecc/grumpkin';
import { User } from '../user';
import { computeNullifier } from 'barretenberg-es/client_proofs/join_split_proof/compute_nullifier';

const debug = createDebug('bb:user_state');

export interface UserTx {
  txId: string;
  userId: number;
  action: UserTxAction;
  value: number;
  recipient: Buffer;
  settled: boolean;
  created: Date;
  inputNote1?: number;
  inputNote2?: number;
  outputNote1?: Buffer;
  outputNote2?: Buffer;
}

export class UserState {
  private notePicker = new NotePicker();
  private userTxs: UserTx[] = [];

  constructor(private user: User, private grumpkin: Grumpkin, private blake2s: Blake2s, private db: Database) {}

  public async init() {
    const dbNotes = await this.db.getUserNotes(this.user.id);
    const owner = await this.db.getUser(this.user.id);
    if (!owner) {
      throw new Error('User not found.');
    }
    const notes = dbNotes.map(({ id: index, viewingKey, value }) => {
      const viewingKeyBuf = Buffer.from(viewingKey);
      const note = new Note(Buffer.from(owner.publicKey), viewingKeyBuf, value);
      return { index, note } as TrackedNote;
    });
    debug(`adding notes for user ${this.user.id}`, notes);
    this.notePicker.addNotes(notes);

    this.userTxs = (await this.db.getUserTxs(this.user.id)).map(dbUserTx => ({
      ...dbUserTx,
      settled: !!dbUserTx.settled,
      recipient: Buffer.from(dbUserTx.recipient),
      outputNote1: dbUserTx.outputNote1 ? Buffer.from(dbUserTx.outputNote1) : undefined,
      outputNote2: dbUserTx.outputNote2 ? Buffer.from(dbUserTx.outputNote2) : undefined,
    }));
  }

  public getUser() {
    return this.user;
  }

  public async processBlock(block: Block) {
    let updated = false;

    for (let i = 0; i < block.dataEntries.length; ++i) {
      const dataEntry = block.dataEntries[i];
      const encryptedNote = block.viewingKeys[i];
      const treeIndex = block.dataStartIndex + i;

      if (this.notePicker.hasNote(treeIndex)) {
        continue;
      }

      const note = decryptNote(encryptedNote, this.user.privateKey!, this.grumpkin);
      if (!note) {
        continue;
      }
      debug(`user ${this.user.id} successfully decrypted note at index ${treeIndex}:`, note);

      const { secret, value } = note;
      const nullifier = computeNullifier(dataEntry, treeIndex, secret, this.blake2s);
      const dbNote = new DbNote(treeIndex, value, secret, encryptedNote, nullifier, 0, this.user.id);
      const trackedNote = { index: dbNote.id, note };
      await this.confirmNoteCreated(dbNote, trackedNote, dataEntry, value);
      updated = true;
    }

    for (const nullifier of block.nullifiers) {
      const dbNote = await this.db.getNote(this.user.id, nullifier);
      if (!dbNote || dbNote.nullified) {
        continue;
      }
      await this.confirmNoteDestroyed(dbNote.id);
      updated = true;
    }

    return updated;
  }

  private async confirmNoteCreated(dbNote: DbNote, trackedNote: TrackedNote, noteBuffer: Buffer, value: number) {
    await this.db.addNote(dbNote);
    this.notePicker.addNote(trackedNote);

    let userTx = this.userTxs.find(
      tx =>
        (tx.outputNote1 && tx.outputNote1.equals(noteBuffer)) || (tx.outputNote2 && tx.outputNote2.equals(noteBuffer)),
    );
    if (
      !userTx || // If no matching buffer, it should be a tx sent from other user.
      (userTx.action === 'TRANSFER' && userTx.recipient.equals(this.user.publicKey) && value === userTx.value)
    ) {
      userTx = {
        txId: noteBuffer.toString('hex').slice(0, 64), // TODO - find real txId or allow it to be empty in database
        userId: this.user.id,
        action: 'RECEIVE',
        value,
        recipient: this.user.publicKey,
        settled: true,
        created: new Date(),
        outputNote1: noteBuffer,
      };
      await this.addUserTx(userTx);
    }
    if (userTx && !userTx.settled) {
      this.settleUserTx(userTx);
    }
  }

  private async confirmNoteDestroyed(noteId: number) {
    const note = this.notePicker.removeNote(noteId)!;
    debug(`user ${this.user.id} nullified note at index ${note.index}`, note);
    await this.db.nullifyNote(noteId);

    const userTx = this.userTxs.find(tx => tx.inputNote1 === noteId);
    if (userTx && !userTx.settled) {
      await this.settleUserTx(userTx);
    }
  }

  private async settleUserTx(userTx: UserTx) {
    await this.db.settleUserTx(userTx.txId);
    this.userTxs = this.userTxs.map(
      tx =>
        (tx !== userTx && tx) || {
          ...tx,
          settled: true,
        },
    );
  }

  public pickNotes(value: number) {
    return this.notePicker.pick(value);
  }

  public getBalance() {
    return this.notePicker.getNoteSum();
  }

  public async addUserTx(userTx: UserTx) {
    await this.db.addUserTx(
      new DbUserTx(
        userTx.txId,
        userTx.userId,
        userTx.action,
        userTx.value,
        userTx.recipient,
        userTx.settled ? 1 : 0,
        userTx.created,
        userTx.inputNote1,
        userTx.inputNote2,
        userTx.outputNote1,
        userTx.outputNote2,
      ),
    );
    this.userTxs = [userTx, ...this.userTxs];
  }

  public async removeUserTx(txId: string) {
    await this.db.deleteUserTx(txId);
    this.userTxs = this.userTxs.filter(tx => tx.txId !== txId);
  }

  public getUserTxs() {
    return this.userTxs;
  }
}
