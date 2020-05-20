import { Wallet, utils } from 'ethers';
import request from 'supertest';

import { Notes } from '../dest/entity/Notes';
import { Keys } from '../dest/entity/Keys';
import { appFactory } from '../dest/app';
import Server from '../dest/server';

function randomHex(hexLength: number): string {
  return utils.hexlify(utils.randomBytes(hexLength)).slice(2);
}

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

  it('get home route GET /', async () => {
    const response = await request(api).get('/api');
    expect(response.status).toEqual(200);
    expect(response.text).toContain('OK');
  });

  it('should write informtionKey', async () => {
    const informationKeys = [randomHex(20)];
    const id = randomHex(20);

    const response = await request(api).post('/api/account/new').send({ id, informationKeys });
    expect(response.status).toEqual(201);
    expect(response.text).toContain('OK');

    const repository = server.connection.getRepository(Keys);
    const retrievedData = await repository.findOne({ id });
    console.log({ retrievedData });
    expect(retrievedData.id).toEqual(id);
    expect(retrievedData.informationKeys[0]).toEqual(informationKeys[0]);
  });

  it('should reject malformed ID', async () => {
    const informationKeys = [randomHex(20)];
    const malformedID = '0x01';

    const response = await request(api).post('/api/account/new').send({ id: malformedID, informationKeys });
    expect(response.status).toEqual(400);
    expect(response.text).toContain('Fail');
  });

  it('should reject overrwrite of ID with different key', async () => {
    const informationKeys = [randomHex(20)];
    const id = randomHex(20);
    await request(api).post('/api/account/new').send({ id, informationKeys });

    const maliciousInformationKeys = ['0x01'];
    const response = await request(api)
      .post('/api/account/new')
      .send({ id, informationKeys: maliciousInformationKeys });
    expect(response.status).toEqual(403);
    expect(response.text).toContain('Fail');
  });

  it('should fetch keys for a particular ID', async () => {
    const wallet = Wallet.createRandom();
    const id = wallet.address.slice(2);
    const informationKeys = [randomHex(20), randomHex(20)];

    const writeData = await request(api).post('/api/account/new').send({ id, informationKeys });
    expect(writeData.status).toEqual(201);

    const message = 'hello world';
    const signature = await wallet.signMessage(message);
    // '/account/:accountId'
    // '/account/status?signature=0x...&'
    // '/account/:accountID/newNotes/?'
    // '/account/0x../notes'

    // ctx.params.accountId = 0x...
    // ctx.request.query = { signature: 0x... }

    const queryData = await request(api).get('/api/account/:accountId/getKeys').query({ id, signature, message });
    expect(queryData.status).toEqual(200);
    expect(queryData.body.informationKeys[0]).toContain(informationKeys[0]);
    expect(queryData.body.informationKeys[1]).toContain(informationKeys[1]);
  });

  it('should fail to fetch keys for invalid signature', async () => {
    const fakeID = randomHex(20);
    const informationKeys = [randomHex(20)];

    const writeData = await request(api).post('/api/account/new').send({ id: fakeID, informationKeys });
    expect(writeData.status).toEqual(201);

    const message = 'hello world';
    const wallet = Wallet.createRandom();
    const signature = await wallet.signMessage(message);

    const queryData = await request(api)
      .get('/api/account/:accountId/getKeys')
      .query({ id: fakeID, signature, message });
    expect(queryData.status).toEqual(401);
    expect(queryData.text).toContain('Fail');
  });

  it('should write notes into storage', async () => {
    const userA = randomHex(20);
    const userB = randomHex(20);
    const userANote = [{ owner: randomHex(20), viewingKey: randomHex(60) }];
    const userBNote = [{ owner: randomHex(20), viewingKey: randomHex(60) }];

    const responseA = await request(api).post('/api/account/:accountID/newNotes').send({ id: userA, notes: userANote });
    await request(api).post('/api/account/:accountID/newNotes').send({ id: userB, notes: userBNote });
    expect(responseA.status).toEqual(201);
    expect(responseA.text).toContain('OK');

    const repository = server.connection.getRepository(Notes);
    const retrievedNoteData = await repository.find({ relations: ['notes'] });
    expect(retrievedNoteData[0].notes[0].owner).toEqual(userANote[0].owner);
    expect(retrievedNoteData[0].notes[0].viewingKey).toEqual(userANote[0].viewingKey);
    expect(retrievedNoteData[1].notes[0].owner).toEqual(userBNote[0].owner);
    expect(retrievedNoteData[1].notes[0].viewingKey).toEqual(userBNote[0].viewingKey);
  });

  it.only('should retrieve note from storage', async () => {
    const wallet = Wallet.createRandom();
    const message = 'hello world';
    const signature = await wallet.signMessage(message);

    const id = wallet.address.slice(2);
    const owner = randomHex(20);
    const viewingKey = randomHex(60);
    const notes = [{ owner, viewingKey }];

    await request(api).post('/api/account/:accountID/newNotes').send({ id, notes });

    const response = await request(api).get('/api/account/:accountId/getNotes').query({ id, signature, message });
    expect(response.status).toEqual(200);
    expect(response.body.id).toEqual(id);
    expect(response.body.notes[0].owner).toEqual(notes[0].owner);
    expect(response.body.notes[0].viewingKey).toEqual(notes[0].viewingKey);
  });
});
