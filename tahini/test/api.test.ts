import request from 'supertest';
import { createConnection } from 'typeorm';

import { Key } from '../dest/entity/key';
import { appFactory } from '../dest/app';
import  Server from '../dest/server';
import ethSigUtil from 'eth-sig-util';

describe('basic route tests', () => {
  let api: any;
  let server: any;

  const informationKey = 'd68aa45be28d44f29c48da28c301494f4be736e3';
  const id = '7f42e32026645201a6d3ad3099eeaf53b2815ea3';

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
    const response = await request(api).post('/api/account/new').send({ id, informationKey });
    expect(response.status).toEqual(201);
    expect(response.text).toContain('OK');

    // TODO: check state update in database
    const repository = server.connection.getRepository(Key);
    const retrievedData = await repository.findOne({id});
    expect(retrievedData.id).toEqual(id);
    expect(retrievedData.informationKey).toEqual(informationKey);
  });

  it('should reject malformed ID', async () => {
    const malformedID = '0x01';
    const response = await request(api).post('/api/account/new').send({ id: malformedID, informationKey });
    expect(response.status).toEqual(400);
    expect(response.text).toContain('Fail');
  });

  it('should reject overrwrite of ID with different key', async () => {
    await request(api).post('/api/account/new').send({ id, informationKey });

    const maliciousInformationKey = '0x01';
    const response = await request(api).post('/api/account/new').send({ id, informationKey: maliciousInformationKey });
    expect(response.status).toEqual(403);
    expect(response.text).toContain('Fail');
  });

  it('should request notes for a particular ID', async () => {
    // const userSignature = 
  });

  it('should request notes for a particular ID', async () => {
    // const userSignature = 
  });
});
