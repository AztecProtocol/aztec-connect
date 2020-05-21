import request from 'supertest';
import { Connection, createConnection } from 'typeorm';

import { appFactory } from '../dest/src/app';
import { Note as NoteEntity } from '../dest/src/entity/Note';
import { NoteDb } from '../dest/src/db/note';
import Server from '../dest/src/server';
import { NoteProcessor } from '../dest/src/note_processor';
import { randomHex } from './helpers';

import { Note, encryptNote, decryptNote } from 'barretenberg/client_proofs/note';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { randomBytes } from 'crypto';

function createNote(grumpkin: Grumpkin, receiverPrivKey: Buffer = randomBytes(32)) {
  const receiverPubKey = grumpkin.mul(Grumpkin.one, receiverPrivKey);
  const secret = randomBytes(32);
  const note = new Note(receiverPubKey, secret, 100);
  const encryptedNote = encryptNote(note, grumpkin); // this is notedata
  const informationKey = receiverPrivKey.toString('hex');
  const id = receiverPubKey.toString('hex');

  return { note, id, informationKey, noteData: encryptedNote };
}

describe('Note processor tests', () => {
  let api!: any;
  let noteProcessor!: any;
  let connection!: any;
  let grumpkin!: Grumpkin;

  beforeEach(async () => {
    const wasm = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(wasm);

    connection = await createConnection();
    const dummyServer = new Server();
    dummyServer.connection = connection;

    noteProcessor = new NoteProcessor();
    noteProcessor.init(connection);

    const app = appFactory(dummyServer, '/api');
    api = app.listen();
  });

  afterEach(async () => {
    await connection.close();
    api.close();
  });

  it('should process a note and save to database', async () => {
    const noteData = [Buffer.from(randomHex(64))];
    const noteNullifier = [Buffer.from(randomHex(64))];
    const blockNum = 5;

    await noteProcessor.processNewNotes(noteData, blockNum, false);
    await noteProcessor.processNewNotes(noteNullifier, blockNum, true);

    const noteRepo = connection.getRepository(NoteEntity);
    const retrievedData: any = await noteRepo.find();

    expect(retrievedData[0].note).toEqual(noteData[0]);
    expect(retrievedData[1].note).toEqual(noteNullifier[0]);
  });

  it.only('should decrypt a note for a provided note owner', async () => {
    // create a note
    const { id, informationKey, noteData } = createNote(grumpkin);

    // create user account
    const response = await request(api).post('/api/account/new').send({ id, informationKey });
    expect(response.status).toEqual(201);
    
    // format notes and decrypt owners if possible
    let notesToSave = noteProcessor.formatNotes([noteData], 5, false);
    notesToSave = await noteProcessor.updateOwners(notesToSave, grumpkin);

    expect(notesToSave.length).toEqual(1);
    expect(notesToSave[0].owner).toEqual(id);
  });

  it.only('should decrypt multiple notes for multiple owners', async () => {
    // create user notes
    const noteA = createNote(grumpkin);
    const dummyNote = createNote(grumpkin); // to check this isn't recorded as an owner
    const noteB = createNote(grumpkin);

    // create user accounts
    await request(api).post('/api/account/new').send({ id: noteA.id, informationKey: noteA.informationKey });
    await request(api).post('/api/account/new').send({ id: noteB.id, informationKey: noteB.informationKey });

    // format notes and decrypt owners if possible
    let notesToSave = noteProcessor.formatNotes([noteA.noteData, dummyNote.noteData, noteB.noteData], 5, false);
    notesToSave = await noteProcessor.updateOwners(notesToSave, grumpkin);

    expect(notesToSave.length).toEqual(3);
    expect(notesToSave[0].owner).toEqual(noteA.id);
    expect(notesToSave[1].owner).toEqual(undefined);
    expect(notesToSave[2].owner).toEqual(noteB.id);
  });

  it.only('should update informationKey links with decrypted note owners', async () => {
    const privateKey = randomBytes(32);
    const userFirstNote = createNote(grumpkin, privateKey);
    const userSecondNote = createNote(grumpkin, privateKey);

    await request(api).post('/api/account/new').send({ id: userFirstNote.id, informationKey: userFirstNote.informationKey });
    await request(api).post('/api/account/new').send({ id: userSecondNote.id, informationKey: userSecondNote.informationKey });

    // format notes and decrypt owners if possible
    let notesToSave = noteProcessor.formatNotes([userFirstNote.noteData, userSecondNote.noteData], 5, false);
    notesToSave = await noteProcessor.updateOwners(notesToSave, grumpkin);

    // save notes, with decrypted owners, to local database
    const noteDb = new NoteDb(connection);
    noteDb.init();
    await noteDb.saveNotes(notesToSave);

    // TODO: replace with a route GET method
    const noteRepo = connection.getRepository(NoteEntity);
    const notesForKey = await noteRepo.find();
    console.log({ notesForKey });

    const userPublicKey = userFirstNote.id;
    console.log({ userPublicKey });
    expect(notesForKey.length).toEqual(2);
    expect(notesForKey[0].owner).toEqual(userPublicKey);
    expect(notesForKey[1].owner).toEqual(userPublicKey);
  });
});
