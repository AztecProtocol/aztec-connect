import { Wallet } from 'ethers';
import request from 'supertest';

import { Note } from '../dest/src/entity/Note';
import { Key } from '../dest/src/entity/Key';
import { appFactory } from '../dest/src/app';
import { NoteDb } from '../dest/src/db/note';

import Server from '../dest/src/server';
import { randomHex, createNoteEntity } from './helpers'


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

    it('should create account with ID and informationKey', async () => {
      const informationKey = randomHex(20);
      const id = randomHex(20);

      const response = await request(api).post('/api/account/new').send({ id, informationKey });
      expect(response.status).toEqual(201);
      expect(response.text).toContain('OK');

      const repository = server.connection.getRepository(Key);
      const retrievedData = await repository.findOne({ id });
      expect(retrievedData.id).toEqual(id);
      expect(retrievedData.informationKey[0]).toEqual(informationKey[0]);
    });

    it('should get the notes associated with a user account', async () => {
      const wallet = Wallet.createRandom();
      const message = 'hello world';
      const signature = await wallet.signMessage(message);
      const id = wallet.address.slice(2);
      const informationKey = randomHex(20);

      // create the user's account
      const writeResponse = await request(api).post('/api/account/new').send({ id, informationKey });
      expect(writeResponse.status).toEqual(201);

      // Simulate action of blockchain server - store some notes in the database
      const noteA: Note = createNoteEntity(id);
      const noteB: Note = createNoteEntity(id);
      const userNotes = [noteA, noteB];

      const noteRepo = server.connection.getRepository(Note);
      await noteRepo.save(userNotes);

      const readResponse = await request(api).get('/api/account/getNotes').query({ id, signature, message });
      expect(readResponse.status).toEqual(200);
      expect(readResponse.body[0].blockNum).toEqual(noteA.blockNum)
      expect(readResponse.body[0].nullifier).toEqual(noteA.nullifier);
      expect(readResponse.body[0].owner).toEqual(noteA.owner);
      expect(readResponse.body[1].blockNum).toEqual(noteA.blockNum)
      expect(readResponse.body[1].nullifier).toEqual(noteA.nullifier);
      expect(readResponse.body[1].owner).toEqual(noteA.owner);
    });
  });

  describe('Failure cases', () => {
    it('should fail to write informationKey for malformed ID', async () => {
      const informationKey = randomHex(20);
      const malformedID = 'ZYtj';

      const response = await request(api).post('/api/account/new').send({ id: malformedID, informationKey });
      expect(response.status).toEqual(400);
      expect(response.text).toContain('Fail');
    });

    it('should fail to overwrite user information key', async () => {
      const informationKey = randomHex(20);
      const id = randomHex(20);
      await request(api).post('/api/account/new').send({ id, informationKey });

      const maliciousInformationKeys = '01';
      const response = await request(api)
        .post('/api/account/new')
        .send({ id, informationKey: maliciousInformationKeys });
      expect(response.status).toEqual(403);
      expect(response.text).toContain('Fail');
    });

    it('should fail to fetch notes for invalid signature', async () => {
      const wallet = Wallet.createRandom();
      const message = 'hello world';
      const signature = await wallet.signMessage(message);
      const fakeId = randomHex(20);
      const userNotes = [createNoteEntity()];
      await request(api).post('/api/account/getNotes').send({ id: fakeId, notes: userNotes });

      const readResponse = await request(api).get('/api/account/getNotes').query({ id: fakeId, signature, message });
      expect(readResponse.status).toEqual(401);
      expect(readResponse.text).toContain('Fail');
    });
  });
});
