import request from 'supertest';
import { Connection, createConnection } from 'typeorm';

import { appFactory } from '../dest/src/app';
import { Note as NoteEntity } from '../dest/src/entity/Note';
import Server from '../dest/src/server';
import { NoteProcessor } from '../dest/src/note_processor';
import { randomHex } from './helpers';

import { Note, encryptNote, decryptNote } from 'barretenberg/client_proofs/note';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { randomBytes } from 'crypto';

function createNote(grumpkin: Grumpkin) {
  const receiverPrivKey = randomBytes(32);
  const receiverPubKey = grumpkin.mul(Grumpkin.one, receiverPrivKey);
  const secret = randomBytes(32);
  const note = new Note(receiverPubKey, secret, 100);
  const encryptedNote = encryptNote(note, grumpkin); // this is notedata
  const informationKeys = receiverPrivKey.toString('hex');
  const id = receiverPubKey.toString('hex');

  return { note, id, informationKeys, noteData: encryptedNote };
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

  it('should decrypt a note for a provided note owner', async () => {
    // create a note
    const { id, informationKeys, noteData } = createNote(grumpkin);

    // create user account
    const response = await request(api).post('/api/account/new').send({ id, informationKeys });
    expect(response.status).toEqual(201);

    // sync notes off blockchain into database
    const syncNotes = await noteProcessor.syncNotes([noteData], 5, false);

    // ascertain owners
    const owners = await noteProcessor.ascertainOwners(syncNotes, grumpkin);
    expect(owners.length).toEqual(1);
    expect(owners[0]).toEqual(Buffer.from(id, 'hex'));
  });

  it('should decrypt multiple notes for multiple owners', async () => {
    // create user notes
    const noteA = createNote(grumpkin);
    const dummyNote = createNote(grumpkin); // to check this isn't recorded as an owner
    const noteB = createNote(grumpkin);

    // create user accounts
    await request(api).post('/api/account/new').send({ id: noteA.id, informationKeys: noteA.informationKeys });
    await request(api).post('/api/account/new').send({ id: noteB.id, informationKeys: noteB.informationKeys });

    // sync notes off blockchain into database
    const syncNotes = await noteProcessor.syncNotes([noteA.noteData, dummyNote.noteData, noteB.noteData], 5, false);

    // ascertain owners
    const owners = await noteProcessor.ascertainOwners(syncNotes, grumpkin);
    expect(owners.length).toEqual(2);
    expect(owners[0]).toEqual(Buffer.from(noteA.id, 'hex'));
    expect(owners[1]).toEqual(Buffer.from(noteB.id, 'hex'));
  });

  it('should update informationKey links with decrypted note owners', async () => {
    const noteA = createNote(grumpkin);
    
  });
});
