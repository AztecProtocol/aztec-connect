import { Connection } from 'typeorm';

import { Note } from './entity/note';
import { NoteDb } from './note_db';
import { KeyDb } from './key_db';

// exposes a function to: save new notes
// try to decrypt all notes without owner given a key
// can do this by having fail-safe function which does decryption for one key + partialling them
export class NoteProcessor {
    private noteDb!: NoteDb;
    private keyDb!: KeyDb;

    public async init(connection: Connection) {
        this.noteDb = new NoteDb(connection);
        this.keyDb = new KeyDb(connection);

        await this.noteDb.init();
        await this.keyDb.init();
    }

    public async processNewNotes(notes: Buffer[], blockNum: number, isNullifiers: boolean) {
        const notesToSave: Note[] = notes.map(noteData => {
            const note = new Note();
            note.blockNum = blockNum;
            note.note = noteData;
            note.nullifier = isNullifiers;

            return note;
        });
        await this.noteDb.saveNotes(notesToSave);

        console.log(notes, blockNum, isNullifiers);
        // fetch keys
        // assertain ownership
        // save
    }
}