import { randomBytes } from 'crypto';
import request from 'supertest';

import { appFactory } from './app';
import Server from './server';
import { createNote } from './helpers';

describe('Server sync', () => {
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

  it.only('should process transaction, save notes and update note owners', async () => {
    // Two users, A and B, sign up for the service
    const informationKeyA = randomBytes(32);
    const userADataNote = createNote(server.grumpkin, informationKeyA);
    const userANullifierNote = createNote(server.grumpkin, informationKeyA);

    const informationKeyB = randomBytes(32);
    const userBDataNote = createNote(server.grumpkin, informationKeyB);
    const userBNullifierNote = createNote(server.grumpkin, informationKeyB);

    const responseA = await request(api)
      .post('/api/account/new')
      .send({ id: userADataNote.id, informationKey: informationKeyA.toString('hex') });
    expect(responseA.status).toEqual(201);

    const responseB = await request(api)
      .post('/api/account/new')
      .send({ id: userBDataNote.id, informationKey: informationKeyB.toString('hex') });
    expect(responseB.status).toEqual(201);

    // Users interact on the blockchain, submitting transactions
    await server.blockchain.submitTx([userADataNote.noteData], [userANullifierNote.noteData]);
    await server.blockchain.submitTx([userBDataNote.noteData], [userBNullifierNote.noteData]);

    // Users later seek to retrieve their notes easily
    const message = 'hello world';
    const signature = '000'; // TODO: correct when know how to sign

    const userARead = await request(api)
      .get('/api/account/getNotes')
      .query({ id: userADataNote.id, signature, message });

    // Have to check multiple possible assertions, due to undefined processing order of data and nullifier
    expect(userARead.body[0].blockNum).toEqual(0);
    expect([true, false]).toContain(userARead.body[0].nullifier);
    expect([userADataNote.id, userANullifierNote.id]).toContain(userARead.body[0].owner);

    expect(userARead.body[1].blockNum).toEqual(0);
    expect([true, false]).toContain(userARead.body[1].nullifier);
    expect([userANullifierNote.id, userADataNote.id]).toContain(userARead.body[1].owner);

    const userBRead = await request(api)
      .get('/api/account/getNotes')
      .query({ id: userBDataNote.id, signature, message });

    expect(userBRead.body[0].blockNum).toEqual(1);
    expect([true, false]).toContain(userBRead.body[0].nullifier);
    expect([userBDataNote.id, userBNullifierNote.id]).toContain(userBRead.body[0].owner);

    expect(userBRead.body[1].blockNum).toEqual(1);
    expect([true, false]).toContain(userBRead.body[1].nullifier);
    expect([userBNullifierNote.id, userBDataNote.id]).toContain(userBRead.body[1].owner);
  });
});
