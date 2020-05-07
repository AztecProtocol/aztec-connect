import { Block } from 'barretenberg-es/block_source';
import { decryptNote, Note } from 'barretenberg-es/client_proofs/note';
import createDebug from 'debug';
import { Blake2s } from 'barretenberg-es/crypto/blake2s';
import { NotePicker, TrackedNote } from '../note_picker';
import { Database, DbNote } from '../database';
import { Grumpkin } from 'barretenberg-es/ecc/grumpkin';
import { User } from '../user';
import { computeNullifier } from 'barretenberg-es/client_proofs/join_split_proof/compute_nullifier';

const debug = createDebug('bb:user_state');

export class UserState {
  private notePicker = new NotePicker();

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

      const note = decryptNote(encryptedNote, this.user.privateKey, this.grumpkin);
      if (!note) {
        continue;
      }
      debug(`user ${this.user.id} successfully decrypted note at index ${treeIndex}:`, note);

      const { secret, value } = note;
      const nullifier = computeNullifier(dataEntry, treeIndex, secret, this.blake2s);
      const dbNote = new DbNote(treeIndex, value, secret, encryptedNote, nullifier, false, this.user.id);

      await this.db.addNote(dbNote);
      this.notePicker.addNote({ index: treeIndex, note });
      updated = true;
    }

    for (const nullifier of block.nullifiers) {
      const dbNote = await this.db.getNote(this.user.id, nullifier);
      if (!dbNote || dbNote.nullified) {
        continue;
      }
      const note = this.notePicker.removeNote(dbNote.id)!;
      debug(`user ${this.user.id} nullified note at index ${note.index}`, note);
      await this.db.nullifyNote(dbNote.id);
      updated = true;
    }

    return updated;
  }

  public pickNotes(value: number) {
    return this.notePicker.pick(value);
  }

  public getBalance() {
    return this.notePicker.getNoteSum();
  }
}
