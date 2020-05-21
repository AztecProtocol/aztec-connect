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
    const notesToSave = await this.syncNotes(notes, blockNum, isNullifiers);
    const owners = await this.ascertainOwners(notesToSave, this.grumpkin)
    await this.updateOwners(owners, notesToSave);

  }

  public async syncNotes(notes: Buffer[], blockNum: number, isNullifiers: boolean) {
    const notesToSave: Note[] = notes.map(noteData => {
        const note = new Note();
        note.blockNum = blockNum;
        note.note = noteData;
        note.nullifier = isNullifiers;
        return note;
      });
      await this.noteDb.saveNotes(notesToSave);
      return notesToSave;
  }

  public async ascertainOwners(notes: Note[], grumpkin: Grumpkin) {
    const keys = await this.keyRepo.find();

    const owners: any[] = []
    keys.forEach((key: any) => {
        notes.forEach((note) => {
            const decryption = decryptNote(note.note, Buffer.from(key.informationKeys, 'hex'), grumpkin);
            if (decryption) {
                owners.push(decryption.ownerPubKey);
            }
        })
    });
    return owners
  }

  public async updateOwners(owners: string[], notes: Note[]) {
    
  }
}
