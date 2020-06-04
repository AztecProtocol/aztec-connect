import { Connection, Repository, createConnection } from 'typeorm';
import { randomBytes } from 'crypto';

import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { BarretenbergWasm } from 'barretenberg/wasm';

import { KeyDb } from '../db/key';
import { NoteDb } from '../db/note';
import { createNote } from '../helpers';
import { ormConfig } from '../../ormconfig';

import { NoteProcessor } from '.';

function createUser(grumpkin: Grumpkin) {
    const informationKey = randomBytes(32);
    const stringInformationKey = informationKey.toString('hex');
    const id = grumpkin.mul(Grumpkin.one, informationKey);
    const stringId = id.toString('hex');

    return {
        informationKey,
        stringInformationKey,
        id,
        stringId,
    }
}

describe('Note processor tests', () => {
    let noteProcessor!: NoteProcessor;
    let noteDb!: NoteDb;
    let connection!: Connection;
    let grumpkin!: Grumpkin;

    beforeEach(async () => {
        connection = await createConnection(ormConfig);

        const keyDb = new KeyDb(connection);
        await keyDb.init();

        noteDb = new NoteDb(connection);
        await noteDb.init();

        const wasm = await BarretenbergWasm.new();
        await wasm.init();
        grumpkin = new Grumpkin(wasm);

        noteProcessor = new NoteProcessor();
        await noteProcessor.init(connection, grumpkin, keyDb);
    });

    afterEach(async () => {
        await connection.close();
    });

    it('should decrypt a note for a provided note owner', async () => {
        // create user account
        const user = createUser(grumpkin);

        // create a note
        const noteData = createNote(grumpkin, user.informationKey);

        // format notes and decrypt owners if possible
        const notesToSave = noteProcessor.formatNotes([noteData], 5, false);

        await noteProcessor.updateOwners(notesToSave, [user.stringInformationKey]);
        const recoveredNote = await noteDb.findByNoteData(noteData);
        expect(recoveredNote.length).toEqual(1);
        expect(recoveredNote[0].owner).toEqual(user.stringId);
    });

    it('should decrypt multiple notes for multiple owners', async () => {
        // create user account
        const userA = createUser(grumpkin);
        const userB = createUser(grumpkin);

        // create notes
        const noteDataA = createNote(grumpkin, userA.informationKey);
        const noteDataB = createNote(grumpkin, userB.informationKey);

        // format notes and decrypt owners if possible
        const notesToSave = noteProcessor.formatNotes([noteDataA, noteDataB], 5, false);

        await noteProcessor.updateOwners(notesToSave, [userA.stringInformationKey, userB.stringInformationKey]);
        const recoveredNoteA = await noteDb.findByNoteData(noteDataA);
        expect(recoveredNoteA.length).toEqual(1);
        expect(recoveredNoteA[0].owner).toEqual(userA.stringId);

        const recoveredNoteB = await noteDb.findByNoteData(noteDataB);
        expect(recoveredNoteB.length).toEqual(1);
        expect(recoveredNoteB[0].owner).toEqual(userB.stringId);
    });

    it('should processNewNotes', async () => {

        const noteDataA = createNote(grumpkin);
        const noteDataB = createNote(grumpkin);

        // Simulate blockchain action - notes created and now being synced into local database
        const blockNum = 5;
        const nullifier = false;
        await noteProcessor.processNewNotes(
          [noteDataA, noteDataB],
          blockNum,
          nullifier,
        );

        const recoveredNoteA = await noteDb.findByNoteData(noteDataA);
        expect(recoveredNoteA.length).toEqual(1);

        const recoveredNoteB = await noteDb.findByNoteData(noteDataB);
        expect(recoveredNoteB.length).toEqual(1);
    });
});
