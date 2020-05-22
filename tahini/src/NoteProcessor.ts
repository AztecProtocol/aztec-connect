import { Connection } from 'typeorm';

import { Note } from './entity/note';
import { Key } from './entity/key';
import { NoteDb } from './db/note';
import { decryptNote } from 'barretenberg/client_proofs/note';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';

export class NoteProcessor {
  private noteDb!: NoteDb;
  private noteRepo!: any;
  private keyRepo!: any;

  public async init(connection: Connection) {
    this.noteDb = new NoteDb(connection);
    this.noteDb.init();
    this.noteRepo = connection.getRepository(Note);
    this.keyRepo = connection.getRepository(Key);
  }

  /**
   * Sync notes off the blockchain to the database. Ascertain note owners where possible,
   * by attempting to decrypt with previously registered keys
   * @param notes
   * @param blockNum
   * @param isNullifiers
   * @param grumpkin
   */
  public async processNewNotes(notes: Buffer[], blockNum: number, isNullifiers: boolean, grumpkin: Grumpkin) {
    let notesToSave = this.formatNotes(notes, blockNum, isNullifiers);
    const keys = await this.keyRepo.find();
    await this.updateOwners(notesToSave, keys, grumpkin);
  }

  /**
   * Process any newly registered keys - search for all notes without owners and attempt to decrypt with
   * the newly registered key
   * @param keys
   * @param grumpkin
   */
  public async processNewKeys(keys: Key[], grumpkin: Grumpkin) {
    const notes = await this.noteRepo.find({ where: { owner: null } }); // find all notes without owners
    await this.updateOwners(notes, keys, grumpkin);
  }

  /**
   * Format an array of note data in buffer form, into entity form required to work with typeorm
   * @param notes
   * @param blockNum
   * @param isNullifiers
   */
  public formatNotes(notes: Buffer[], blockNum: number, isNullifiers: boolean): Note[] {
    let notesToSave: Note[] = notes.map(noteData => {
      const note = new Note();
      note.blockNum = blockNum;
      note.note = noteData;
      note.nullifier = isNullifiers;
      return note;
    });
    return notesToSave;
  }

  /**
   * Attempt note decryption for a supplied set of `notes` with a supplied set of `keys`. If
   * decryption is succesful, set the owner of the note to be the key id
   * @param notes
   * @param keys
   * @param grumpkin
   */
  public async updateOwners(notes: Note[], keys: Key[], grumpkin: Grumpkin) {
    keys.forEach((key: any) => {
      notes.forEach(note => {
        const decryption = decryptNote(note.note, Buffer.from(key.informationKey, 'hex'), grumpkin);
        if (decryption) {
          const owner = decryption.ownerPubKey;
          note.owner = owner.toString('hex');
        }
      });
    });
    await this.noteDb.saveNotes(notes);
  }
}
