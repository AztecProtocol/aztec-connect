import { Wallet, utils } from 'ethers';
import request from 'supertest';

import { DataEntry } from '../dest/entity/DataEntry';
import { appFactory } from '../dest/app';
import Server from '../dest/server';

function randomHex(hexLength: number): string {
  return utils.hexlify(utils.randomBytes(hexLength)).slice(2);
}

function createRandomNote() {
  return { owner: randomHex(20), viewingKey: randomHex(60), informationKey: randomHex(60) };
}

describe.only('basic route tests', () => {
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

    it('should write notes into storage for a user', async () => {
      const userA = randomHex(20);
      const userB = randomHex(20);
      const userANotes = [createRandomNote()];
      const userBNotes = [createRandomNote()];

      const responseA = await request(api).post('/api/account/new').send({ id: userA, notes: userANotes });
      expect(responseA.status).toEqual(201);
      expect(responseA.text).toContain('OK');
      await request(api).post('/api/account/new').send({ id: userB, notes: userBNotes });

      const repository = server.connection.getRepository(DataEntry);

      // User A
      const retrievedUserAData = await repository.findOne({ where: { id: userA }, relations: ['notes'] });
      expect(retrievedUserAData.notes[0].owner).toEqual(userANotes[0].owner);
      expect(retrievedUserAData.notes[0].viewingKey).toEqual(userANotes[0].viewingKey);
      expect(retrievedUserAData.notes[0].informationKey).toEqual(userANotes[0].informationKey);

      // User B
      const retrievedUserBData = await repository.findOne({ where: { id: userB }, relations: ['notes'] });
      expect(retrievedUserBData.notes[0].owner).toEqual(userBNotes[0].owner);
      expect(retrievedUserBData.notes[0].viewingKey).toEqual(userBNotes[0].viewingKey);
      expect(retrievedUserBData.notes[0].informationKey).toEqual(userBNotes[0].informationKey);
    });

    it.only('should fetch user notes', async () => {
      const wallet = Wallet.createRandom();
      const message = 'hello world';
      const signature = await wallet.signMessage(message);

      const id = wallet.address.slice(2);
      const userNotes = [createRandomNote()];

      const writeResponse = await request(api).post('/api/account/new').send({ id, notes: userNotes });
      expect(writeResponse.status).toEqual(201);

      const readResponse = await request(api).get('/api/account/getNotes').query({ id, signature, message });
      expect(readResponse.status).toEqual(200);
      expect(readResponse.body.id).toEqual(id);
      expect(readResponse.body.notes[0].owner).toEqual(userNotes[0].owner);
      expect(readResponse.body.notes[0].viewingKey).toEqual(userNotes[0].viewingKey);
    });
  });

  describe('Failure cases', () => {
    it('should fail to overwrite user notes', async () => {
      const userA = randomHex(20);
      const userANotes = [createRandomNote()];
      const overwriteNotes = [createRandomNote()];
      await request(api).post('/api/account/new').send({ id: userA, notes: userANotes });

      // attempt overwrite
      const overwriteResponse = await request(api).post('/api/account/new').send({ id: userA, notes: overwriteNotes });
      expect(overwriteResponse.status).toEqual(403);
      expect(overwriteResponse.text).toContain('Fail');
    });

    it('should fail to write notes for malformed ID', async () => {
      const malformedId = randomHex(25);
      const userANotes = [createRandomNote()];

      const response = await request(api).post('/api/account/new').send({ id: malformedId, notes: userANotes });
      expect(response.status).toEqual(400);
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
