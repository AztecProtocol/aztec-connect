import request from 'supertest';

import { appFactory } from '../dest/src/app';
import { Note as NoteEntity } from '../dest/src/entity/Note'
import Server from '../dest/src/server';
import { randomHex } from './helpers';

import { Note, encryptNote } from 'barretenberg/client_proofs/note';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { randomBytes } from 'crypto';



describe('basic sync tests', () => {
  let api: any;
  let server: any;
  let informationKeys: any;

  beforeEach(async () => {
    server = new Server();
    await server.start();

    const app = appFactory(server, '/api');
    api = app.listen();

    // create a note, as it will be stored on the blockchain
    const wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);
    const receiverPrivKey = randomBytes(32);
    const receiverPubKey = grumpkin.mul(Grumpkin.one, receiverPrivKey);
    const secret = randomBytes(32);
    const note = new Note(receiverPubKey, secret, 100);
    const encryptedNote = encryptNote(note, grumpkin); // this is notedata

    informationKeys = receiverPrivKey.toString('hex');
  });

  afterEach(async () => {
    await server.stop();
    api.close();
  });

  it('should process transaction and save notes', async () => {
    const firstNoteData = Buffer.from(randomHex(64));
    const firstNoteNullifier = Buffer.from(randomHex(64));
    const secondNoteData = Buffer.from(randomHex(64));
    const secondNoteNullifier = Buffer.from(randomHex(64));

    await server.blockchain.submitTx([firstNoteData], [firstNoteNullifier]);
    await server.blockchain.submitTx([secondNoteData], [secondNoteNullifier]);

    const noteRepo = server.connection.getRepository(NoteEntity);
    const retrievedData: any = await noteRepo.find();

    // TODO: fix problem whereby the second note isn't placed into the db in time
    expect(retrievedData[0].note).toEqual(firstNoteData);
    expect(retrievedData[1].note).toEqual(firstNoteNullifier);
    // expect(retrievedNote[2].note).toEqual(secondNoteData);
    // expect(retrievedNote[3].note).toEqual(secondNoteNullifier);
  });

  it('should decrypt note owners', async () => {
    // TODO: get actual information key, work out how to decrypt a note 
    // create ID:information key pairing

    const id = randomHex(20);
    console.log({ informationKeys });
    const response = await request(api).post('/api/account/new').send({ id, informationKeys });
    expect(response.status).toEqual(201);

    // create and fetch notes
    const noteData = Buffer.from(randomHex(64));
    const noteNullifier = Buffer.from(randomHex(64));
    await server.blockchain.submitTx([noteData], [noteNullifier]);

    const noteRepo = server.connection.getRepository(NoteEntity);
    const retrivedNotes: any = await noteRepo.find();

    console.log('server.noteProcessor: ', server.noteProcessor)
    const owners = await server.noteProcessor.ascertainOwners(retrivedNotes);
    console.log({ owners });
    expect(owners[0]).toEqual(id);

  });

  it('should link notes to owners', async () => {

  });
});
