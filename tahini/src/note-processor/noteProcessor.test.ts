import request from 'supertest';
import { Repository } from 'typeorm';

import { appFactory } from '../app';
import { Key } from '../entity/key';
import { Note } from '../entity/note';
import { createNote } from '../helpers';
import Server from '../server';

import { randomBytes } from 'ethers/utils';
import { NoteProcessor } from '.';

describe('Note processor tests', () => {
  let api!: any;
  let noteProcessor!: NoteProcessor;
  let server!: Server;
  let keyRepo!: Repository<Key>;
  let noteRepo!: Repository<Note>;

  beforeEach(async () => {
    server = new Server();
    await server.start();

    noteProcessor = server.noteProcessor;

    const app = appFactory(server, '/api');
    api = app.listen();

    keyRepo = server.connection.getRepository(Key);
    noteRepo = server.connection.getRepository(Note);
  });

  afterEach(async () => {
    await server.stop();
    api.close();
  });

  it('should decrypt a note for a provided note owner', async () => {
    // create a note
    const { id, informationKey, noteData, message, signature } = createNote(server);

    // create user account
    const response = await request(api).post('/api/POST/account/new').send({ id, informationKey, message, signature });
    expect(response.status).toEqual(201);

    // format notes and decrypt owners if possible
    const notesToSave = noteProcessor.formatNotes([noteData], 5, false);
    const keys = await keyRepo.find();

    await noteProcessor.updateOwners(notesToSave, keys);
    const recoveredNote = await noteRepo.find({ where: { note: noteData } });
    expect(recoveredNote.length).toEqual(1);
    expect(recoveredNote[0].owner).toEqual(id);
  });

  it('should decrypt multiple notes for multiple owners', async () => {
    // create user notes
    const noteA = createNote(server);
    const dummyNote = createNote(server); // to check this isn't recorded as an owner
    const noteB = createNote(server);

    // create user accounts
    await request(api).post('/api/POST/account/new').send({ id: noteA.id, informationKey: noteA.informationKey, message: noteA.message, signature: noteA.signature });
    await request(api).post('/api/POST/account/new').send({ id: noteB.id, informationKey: noteB.informationKey, message: noteB.message, signature: noteB.signature });

    // format notes and decrypt owners if possible
    const notesToSave = noteProcessor.formatNotes([noteA.noteData, dummyNote.noteData, noteB.noteData], 5, false);
    const keys = await keyRepo.find();

    await noteProcessor.updateOwners(notesToSave, keys);
    const recoveredNoteA = await noteRepo.find({ where: { note: noteA.noteData } });
    const recoveredDummyNote = await noteRepo.find({ where: { note: dummyNote.noteData } });
    const recoveredNoteB = await noteRepo.find({ where: { note: noteB.noteData } });

    expect(recoveredNoteA[0].owner).toEqual(noteA.id);
    expect(recoveredDummyNote[0].owner).toEqual(null);
    expect(recoveredNoteB[0].owner).toEqual(noteB.id);
  });

  it('should `processNewNotes` and be retrieveable using GET route by user ID', async () => {
    const informationKey = randomBytes(32);

    const userFirstNote = createNote(server, Buffer.from(informationKey));
    const userSecondNote = createNote(server, Buffer.from(informationKey));

    // register account for user
    const response = await request(api).post('/api/POST/account/new').send({ id: userFirstNote.id, informationKey: Buffer.from(informationKey).toString('hex'), message: userFirstNote.message, signature: userFirstNote.signature  });
    expect(response.status).toEqual(201);

    // Simulate blockchain action - notes created and now being synced into local database
    const blockNum = 5;
    const nullifier = false;
    await noteProcessor.processNewNotes(
      [userFirstNote.noteData, userSecondNote.noteData],
      blockNum,
      nullifier,
    );

    // Retrieve user notes with GET request
    const readResponse = await request(api)
      .post('/api/GET/account/notes')
      .send({ id: userFirstNote.id, signature: userFirstNote.signature, message: userFirstNote.message });
    expect(readResponse.status).toEqual(200);
    expect(readResponse.body[0].blockNum).toEqual(blockNum);
    expect(readResponse.body[0].nullifier).toEqual(nullifier);
    expect(readResponse.body[0].owner).toEqual(userFirstNote.id);
    expect(readResponse.body[1].blockNum).toEqual(blockNum);
    expect(readResponse.body[1].nullifier).toEqual(nullifier);
    expect(readResponse.body[1].owner).toEqual(userSecondNote.id);
  });
});
