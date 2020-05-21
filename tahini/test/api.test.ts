import { Wallet } from 'ethers';
import request from 'supertest';

import { Note } from '../dest/entity/Note';
import { Key } from '../dest/entity/Key';
import { appFactory } from '../dest/app';
import { NoteDb } from '../dest/db/note';

import Server from '../dest/server';
import { randomHex, createRandomNote } from './helpers'


describe('basic route tests', () => {
  let api: any;
  let server: any;

  beforeEach(async () => {
    server = new Server();
    await server.start();

    const app = appFactory(server, '/api');
    api = app.listen();
  });

  afterEach(async () => {
    await server.stop();
    api.close();
  });

  describe('Success cases', () => {
    it('get home route GET /', async () => {
      const response = await request(api).get('/api');
      expect(response.status).toEqual(200);
      expect(response.text).toContain('OK');
    });

    it('should write informationKey into storage for a user', async () => {
      const informationKeys = randomHex(20);
      const id = randomHex(20);

      const response = await request(api).post('/api/account/new').send({ id, informationKeys });
      expect(response.status).toEqual(201);
      expect(response.text).toContain('OK');

      const repository = server.connection.getRepository(Key);
      const retrievedData = await repository.findOne({ id });
      expect(retrievedData.id).toEqual(id);
      expect(retrievedData.informationKeys[0]).toEqual(informationKeys[0]);
    });

    it('should fetch user notes', async () => {
      const wallet = Wallet.createRandom();
      const message = 'hello world';
      const signature = await wallet.signMessage(message);
      const id = wallet.address.slice(2);
      const informationKeys = randomHex(20);

      // create the user's account
      const writeResponse = await request(api).post('/api/account/new').send({ id, informationKeys });
      expect(writeResponse.status).toEqual(201);

      // Simulate action of blockchain server - store some notes in the database
      const userNotes: any = createRandomNote();
      const existingKey = new Key();
      existingKey.id = id;
      existingKey.informationKeys = informationKeys;
      userNotes.owner = existingKey;
      console.log({ userNotes });
    
      const noteRepo = server.connection.getRepository(Note);
      await noteRepo.save(userNotes);
      // TODO: get saving of notes to auto update Key 

      const readResponse = await request(api).get('/api/account/getNotes').query({ id, signature, message });
      expect(readResponse.status).toEqual(200);
      expect(readResponse.body.id).toEqual(id);
    //   expect(readResponse.body.notes[0].note).toEqual(userNotes.note);
    //   expect(readResponse.body.notes[0].viewingKey).toEqual(userNotes[0].viewingKey);
    });
  });

  describe('Failure cases', () => {
    it('should fail to write informationKey for malformed ID', async () => {
      const informationKeys = randomHex(20);
      const malformedID = '0x01';

      const response = await request(api).post('/api/account/new').send({ id: malformedID, informationKeys });
      expect(response.status).toEqual(400);
      expect(response.text).toContain('Fail');
    });

    it('should fail to overwrite user information key', async () => {
      const informationKeys = randomHex(20);
      const id = randomHex(20);
      await request(api).post('/api/account/new').send({ id, informationKeys });

      const maliciousInformationKeys = '0x01';
      const response = await request(api)
        .post('/api/account/new')
        .send({ id, informationKeys: maliciousInformationKeys });
      expect(response.status).toEqual(403);
      expect(response.text).toContain('Fail');
    });

    it('should fail to fetch notes for invalid signature', async () => {
      const wallet = Wallet.createRandom();
      const message = 'hello world';
      const signature = await wallet.signMessage(message);
      const fakeId = randomHex(20);
      const userNotes = [createRandomNote()];
      await request(api).post('/api/account/getNotes').send({ id: fakeId, notes: userNotes });

      const readResponse = await request(api).get('/api/account/getNotes').query({ id: fakeId, signature, message });
      expect(readResponse.status).toEqual(401);
      expect(readResponse.text).toContain('Fail');
    });
  });
});
