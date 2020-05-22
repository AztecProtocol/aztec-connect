import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { Wallet } from 'ethers';
import request from 'supertest';

import { appFactory } from '../dest/src/app';
import Server from '../dest/src/server';
import { Key } from '../dest/src/entity/key';
import { Note } from '../dest/src/entity/note';
import { createNote, randomHex } from './helpers';

describe('Note processor tests', () => {
  let api!: any;
  let noteProcessor!: any;
  let server!: Server;
  let keyRepo!: any;
  let noteRepo!: any;

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
    const { id, informationKey, noteData } = createNote(server.grumpkin);

    // create user account
    const response = await request(api).post('/api/account/new').send({ id, informationKey });
    expect(response.status).toEqual(201);

    // format notes and decrypt owners if possible
    let notesToSave = noteProcessor.formatNotes([noteData], 5, false);
    const keys = await keyRepo.find();

    await noteProcessor.updateOwners(notesToSave, keys, server.grumpkin);
    const recoveredNote = await noteRepo.find({ where: { note: noteData } });
    expect(recoveredNote.length).toEqual(1);
    expect(recoveredNote[0].owner).toEqual(id);
  });

  it('should decrypt multiple notes for multiple owners', async () => {
    // create user notes
    const noteA = createNote(server.grumpkin);
    const dummyNote = createNote(server.grumpkin); // to check this isn't recorded as an owner
    const noteB = createNote(server.grumpkin);

    // create user accounts
    await request(api).post('/api/account/new').send({ id: noteA.id, informationKey: noteA.informationKey });
    await request(api).post('/api/account/new').send({ id: noteB.id, informationKey: noteB.informationKey });

    // format notes and decrypt owners if possible
    let notesToSave = noteProcessor.formatNotes([noteA.noteData, dummyNote.noteData, noteB.noteData], 5, false);
    const keys = await keyRepo.find();

    await noteProcessor.updateOwners(notesToSave, keys, server.grumpkin);
    const recoveredNoteA = await noteRepo.find({ where: { note: noteA.noteData } });
    const recoveredDummyNote = await noteRepo.find({ where: { note: dummyNote.noteData } });
    const recoveredNoteB = await noteRepo.find({ where: { note: noteB.noteData } });

    expect(recoveredNoteA[0].owner).toEqual(noteA.id);
    expect(recoveredDummyNote[0].owner).toEqual(null);
    expect(recoveredNoteB[0].owner).toEqual(noteB.id);
  });

  it('should `processNewNotes` and be retrieveable using GET route by user ID', async () => {
    const wallet = Wallet.createRandom();
    const informationKey = wallet.privateKey.slice(2);

    // TODO: find out how to sign over grumpkin curve. Do notes definitely have to be defined on
    // grumpkin full stop?
    // Problem is as follows:
    // Private key can be anything, random bytes or a private key from another curve.
    // The public key is derived from the privateKey. The public key IS on the grumpkin curve

    // A signature is produced using the privateKey. In a standard Ethereum setup, the privateKey is
    // defined over the secp256k1 curve.

    // When ecrecover() is used on the signature, it will recover the secp256k1 public key - rather
    // than the desired grumpkin one

    const userFirstNote = createNote(server.grumpkin, Buffer.from(informationKey, 'hex'));
    const userSecondNote = createNote(server.grumpkin, Buffer.from(informationKey, 'hex'));
    const message = 'hello world';
    const signature = await wallet.signMessage(message);

    // register account for user
    const response = await request(api).post('/api/account/new').send({ id: userFirstNote.id, informationKey });
    expect(response.status).toEqual(201);

    // Simulate blockchain action - notes created and now being synced into local database
    const blockNum = 5;
    const nullifier = false;
    await noteProcessor.processNewNotes(
      [userFirstNote.noteData, userSecondNote.noteData],
      blockNum,
      nullifier,
      server.grumpkin,
    );

    // Retrieve user notes with GET request
    const readResponse = await request(api)
      .get('/api/account/getNotes')
      .query({ id: userFirstNote.id, signature, message });
    expect(readResponse.status).toEqual(200);
    expect(readResponse.body[0].blockNum).toEqual(blockNum);
    expect(readResponse.body[0].nullifier).toEqual(nullifier);
    expect(readResponse.body[0].owner).toEqual(userFirstNote.id);
    expect(readResponse.body[1].blockNum).toEqual(blockNum);
    expect(readResponse.body[1].nullifier).toEqual(nullifier);
    expect(readResponse.body[1].owner).toEqual(userSecondNote.id);
  });
});
