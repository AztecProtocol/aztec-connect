import { Connection } from 'typeorm';

import { Note } from './entity/note';
import { Key } from './entity/key';
import { NoteDb } from './db/note';
import { decryptNote } from 'barretenberg/client_proofs/note';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { BarretenbergWasm } from 'barretenberg/wasm';

import { KeyDb } from './db/key';

// exposes a function to: save new notes
// try to decrypt all notes without owner given a key
// can do this by having fail-safe function which does decryption for one key + partialling them
export class NoteProcessor {
  private noteDb!: NoteDb;
  private keyRepo!: any;
  private grumpkin!: Grumpkin;

  public async init(connection: Connection) {
    this.noteDb = new NoteDb(connection);
    this.keyRepo = connection.getRepository(Key);
    this.noteDb.init();

    const wasm = await BarretenbergWasm.new();
    this.grumpkin = new Grumpkin(wasm);
  }

  public async processNewNotes(notes: Buffer[], blockNum: number, isNullifiers: boolean) {
    let notesToSave = this.formatNotes(notes, blockNum, isNullifiers); 
    notesToSave = await this.updateOwners(notesToSave, this.grumpkin)
    await this.noteDb.saveNotes(notesToSave);
  }

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

  public async updateOwners(notes: Note[], grumpkin: Grumpkin): Promise<Note[]> {
    const keys = await this.keyRepo.find();

    keys.forEach((key: any) => {
        notes.forEach((note) => {
            const decryption = decryptNote(note.note, Buffer.from(key.informationKey, 'hex'), grumpkin);
            if (decryption) {
                const owner = decryption.ownerPubKey;
                note.owner = owner.toString('hex');
            }
        })
    });
    return notes;
  }
}
