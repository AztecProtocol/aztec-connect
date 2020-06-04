import { Connection, Repository } from 'typeorm';

import { decryptNote } from 'barretenberg/client_proofs/note';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';

import { NoteDb } from '../db/note';
import { KeyDb } from '../db/key';
import { Note } from '../entity/note';

export class NoteProcessor {
    private noteDb!: NoteDb;
    private noteRepo!: Repository<Note>;
    private keyDb!: KeyDb;
    public grumpkin!: Grumpkin;

    public async init(connection: Connection, grumpkin: Grumpkin, keyDb: KeyDb) {
        this.noteDb = new NoteDb(connection);
        this.noteDb.init();
        this.noteRepo = connection.getRepository(Note);
        this.keyDb = keyDb;
        this.grumpkin = grumpkin;
    }

    /**
     * Format an array of note data in buffer form, into entity form required to work with typeorm
     * 
     * @param notes - array of noteData, where noteData is represented as a buffer
     * @param blockNum - block number the notes are included in 
     * @param isNullifiers - boolean determining whether the the notes belong to a nullifier set (false) or a 
     * data set (true)
     */
    public formatNotes(notes: Buffer[], blockNum: number, isNullifiers: boolean): Note[] {
        const notesToSave: Note[] = notes.map(noteData => {
            const note = new Note();
            note.blockNum = blockNum;
            note.note = noteData;
            note.nullifier = isNullifiers;
            return note;
        });
        return notesToSave;
    }

    /**
     * Sync notes off the blockchain to the database. Ascertain note owners where possible,
     * by attempting to decrypt with previously registered keys
     * 
     * @param notes - array of noteData, where noteData is represented as a buffer
     * @param blockNum - block number the notes are included in 
     * @param isNullifiers - boolean determining whether the the notes belong to a nullifier set (false) or a 
     * data set (true)
     * @param grumpkin - grumpkin instance to use when decrypting notes
     */
    public async processNewNotes(notes: Buffer[], blockNum: number, isNullifiers: boolean) {
        const notesToSave = this.formatNotes(notes, blockNum, isNullifiers);
        const keys = await this.keyDb.fetchAllInformationKeys();
        await this.updateOwners(notesToSave, keys);
    }

    /**
     * Process any newly registered keys - search for all notes without owners and attempt to decrypt with
     * the newly registered key
     * 
     * @param informationKey - newly registered key for which pre-existing notes will be 
     * @param grumpkin - grumpkin instance to use when decrypting notes
     */
    public async processNewKey(informationKey: string) {
        const notes = await this.noteRepo.find({ where: { owner: null } }); // find all notes without owners
        await this.updateOwners(notes, [informationKey]);
    }

    /**
     * Attempt note decryption for a supplied set of `notes` with a supplied set of `keys`. If
     * decryption is succesful, set the owner of the note to be the key id
     * @param notes - array of noteData, where noteData is represented as a buffer
     * @param keys - array of ID:informationKey pairs
     * @param grumpkin - grumpkin instance to use when decrypting notes
     */
    public async updateOwners(notes: Note[], informationKeys: string[]) {
        notes.forEach((note: Note) => {
            informationKeys.forEach(informationKey => {
                const decryption = decryptNote(note.note, Buffer.from(informationKey, 'hex'), this.grumpkin);
                if (decryption) {
                    const owner = decryption.ownerPubKey;
                    note.owner = owner.toString('hex');
                }
            });
        });
        await this.noteDb.saveNotes(notes);
    }
}
