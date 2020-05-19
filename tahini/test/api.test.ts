import { Wallet, utils } from 'ethers';
import request from 'supertest';

import { Note } from '../dest/entity/note';
import { Key } from '../dest/entity/key';
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

  it('should save information key', async () => {
    const informationKey = randomHex(20);
    const id = randomHex(20);

    const response = await request(api).post('/api/account/new').send({ id, informationKey });
    expect(response.status).toEqual(201);
    expect(response.text).toContain('OK');

    const repository = server.connection.getRepository(Key);
    const retrievedData = await repository.findOne({ id });
    expect(retrievedData.id).toEqual(id);
    expect(retrievedData.informationKey).toEqual(informationKey);
  });

  it('should reject malformed ID', async () => {
    const informationKey = randomHex(20);
    const malformedID = '0x01';
    
    const response = await request(api).post('/api/account/new').send({ id: malformedID, informationKey });
    expect(response.status).toEqual(400);
    expect(response.text).toContain('Fail');
  });

  it('should reject overrwrite of ID with different key', async () => {
    const informationKey = randomHex(20);
    const id = randomHex(20);
    await request(api).post('/api/account/new').send({ id, informationKey });

    const maliciousInformationKey = '0x01';
    const response = await request(api).post('/api/account/new').send({ id, informationKey: maliciousInformationKey });
    expect(response.status).toEqual(403);
    expect(response.text).toContain('Fail');
  });

  it('should fetch keys for a particular ID', async () => {
    const wallet = Wallet.createRandom();
    const id = wallet.address.slice(2);
    const informationKey = randomHex(20);

    const writeData = await request(api).post('/api/account/new').send({ id, informationKey });
    expect(writeData.status).toEqual(201);

    const message = 'hello world';
    const signature = await wallet.signMessage(message);
    // '/account/:accountId'
    // '/account/status?signature=0x...&'
    // '/account/:accountId/notes/?'
    // '/account/0x../notes'

    // ctx.params.accountId = 0x...
    // ctx.request.query = { signature: 0x... }

    const queryData = await request(api).get('/api/account/:accountId/key').query({ id, signature, message });

    expect(queryData.status).toEqual(200);
    expect(queryData.text).toContain(informationKey);
  });

  it('should fail to fetch keys for invalid signature', async () => {
    const id = randomHex(20);
    const informationKey = randomHex(20);

    // create 2 entries in the database, same id but different informationKey
    const writeData = await request(api).post('/api/account/new').send({ id, informationKey });
    expect(writeData.status).toEqual(201);

    const message = 'hello world';
    const wallet = Wallet.createRandom();
    const fakeID = wallet.address.slice(2);
    const signature = await wallet.signMessage(message);

    const queryData = await request(api).get('/api/account/:accountId/key').query({ id: fakeID, signature, message });

    expect(queryData.status).toEqual(401);
    expect(queryData.text).toContain('Fail');
  });

  it('should write notes into storage', async () => {
    const id = randomHex(20);
    const owner = randomHex(20);
    const viewingKey = randomHex(60);

    const note = {id, owner, viewingKey };
    const response = await request(api).post('/api/account/:accountID/notes').send({ note });
    expect(response.status).toEqual(201);
    expect(response.text).toContain('OK');

    const repository = server.connection.getRepository(Note);
    const retrievedNoteData = await repository.findOne({ note });
    expect(retrievedNoteData.id).toEqual(id);
    expect(retrievedNoteData.owner).toEqual(owner);
    expect(retrievedNoteData.viewingKey).toEqual(viewingKey);
  });
});
