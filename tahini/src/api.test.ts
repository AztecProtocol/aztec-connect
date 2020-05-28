import { Wallet } from 'ethers';
import request from 'supertest';

import { Note } from './entity/Note';
import { Key } from './entity/Key';
import { appFactory } from './app';

import Server from './server';
import { randomHex, createNoteEntity } from './helpers';
import { TextEncoder } from 'util';
import { randomBytes } from 'ethers/utils';

describe('Route tests', () => {
  let api: any;
  let server: any;
  let signature: any;
  let id: any;
  let informationKey: any;
  let message: any;
  let pubKey: any;

  beforeEach(async () => {
    server = new Server();

    await server.start();
    const app = appFactory(server, '/api');
    api = app.listen();

    const privateKey = randomBytes(32);
    message = 'hello world';
    signature = server.schnorr.constructSignature(new TextEncoder().encode(message), privateKey);
    pubKey = server.schnorr.computePublicKey(privateKey).toString('hex');
    id = pubKey;
    informationKey = randomHex(20);
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
      const response = await request(api)
        .post('/api/account/new')
        .send({ id: pubKey, informationKey, signature, message });
      expect(response.status).toEqual(201);
      expect(response.text).toContain('OK');

      const repository = server.connection.getRepository(Key);
      const retrievedData = await repository.findOne({ id: pubKey });
      expect(retrievedData.id).toEqual(pubKey);
      expect(retrievedData.informationKey[0]).toEqual(informationKey[0]);
    });

    it('should get the notes associated with a user account', async () => {
      // create the user's account
      const writeResponse = await request(api)
        .post('/api/account/new')
        .send({ id, informationKey, message, signature });
      expect(writeResponse.status).toEqual(201);

      // Simulate action of blockchain server - store some notes in the database
      const noteA: Note = createNoteEntity(id);
      const noteB: Note = createNoteEntity(id);
      const userNotes = [noteA, noteB];

      const noteRepo = server.connection.getRepository(Note);
      await noteRepo.save(userNotes);

      const readResponse = await request(api).post('/api/account/getNotes').send({ id, signature, message });
      expect(readResponse.status).toEqual(200);
      expect(readResponse.body[0].blockNum).toEqual(noteA.blockNum);
      expect(readResponse.body[0].nullifier).toEqual(noteA.nullifier);
      expect(readResponse.body[0].owner).toEqual(noteA.owner);
      expect(readResponse.body[1].blockNum).toEqual(noteA.blockNum);
      expect(readResponse.body[1].nullifier).toEqual(noteA.nullifier);
      expect(readResponse.body[1].owner).toEqual(noteA.owner);
    });

    it('should update key associated with a user account', async () => {
      const keyRepo = server.connection.getRepository(Key);

      const response = await request(api).post('/api/account/new').send({ id, informationKey, message, signature });
      expect(response.status).toEqual(201);

      // updateKey
      const newInformationKey = randomHex(20);
      const updateResponse = await request(api).post('/api/account/updateKey').send({ id, newInformationKey, message, signature });
      expect(updateResponse.status).toEqual(200);

      const updatedKey = await keyRepo.find({ where: { id } });
      expect(updatedKey[0].id).toEqual(id);
      expect(updatedKey[0].informationKey).toEqual(newInformationKey);
    });
  });

  describe('Failure cases', () => {
    it('should fail to write informationKey for malformed ID', async () => {
      const malformedID = 'ZYtj';

      const response = await request(api).post('/api/account/new').send({ id: malformedID, informationKey, message, signature });
      expect(response.status).toEqual(400);
      expect(response.text).toContain('Fail');
    });

    it('should fail to overwrite user information key with non-user signature', async () => {
      await request(api).post('/api/account/new').send({ id, informationKey, message, signature });

      const maliciousInformationKeys = '01';
      
      // mutate the signature
      signature.s = Buffer.from(randomBytes(32));

      const response = await request(api)
        .post('/api/account/new')
        .send({ id, informationKey: maliciousInformationKeys, message, signature });
      expect(response.status).toEqual(401);
      expect(response.text).toContain('Fail');
    });

    it('should fail to fetch notes for non-user signature', async () => {
      const userNotes = [createNoteEntity()];
      await request(api).post('/api/account/getNotes').send({ id, notes: userNotes, message, signature });
            
      // mutate the signature
      signature.s = Buffer.from(randomBytes(32));

      const readResponse = await request(api).post('/api/account/getNotes').send({ id, informationKey, signature, message });
      expect(readResponse.status).toEqual(401);
      expect(readResponse.text).toContain('Fail');
    });
  });
});
