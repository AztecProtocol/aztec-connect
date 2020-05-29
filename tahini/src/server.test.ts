import { randomBytes } from 'crypto';
import request from 'supertest';

import { appFactory } from './app';
import { createNote } from './helpers';
import Server from './server';

describe('Server sync', () => {
  let api: any;
  let server: Server;

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

  it('should process transaction, save notes and update note owners', async () => {
    // Two users, A and B, sign up for the service
    const informationKeyA = randomBytes(32);
    const userADataNote = createNote(server, informationKeyA);
    const userANullifierNote = createNote(server, informationKeyA);

    const informationKeyB = randomBytes(32);
    const userBDataNote = createNote(server, informationKeyB);
    const userBNullifierNote = createNote(server, informationKeyB);

    const responseA = await request(api)
      .post('/api/POST/account/new')
      .send({ id: userADataNote.id, informationKey: informationKeyA.toString('hex'), message: userADataNote.message, signature: userADataNote.signature });
    expect(responseA.status).toEqual(201);

    const responseB = await request(api)
      .post('/api/POST/account/new')
      .send({ id: userBDataNote.id, informationKey: informationKeyB.toString('hex'), message: userBDataNote.message, signature: userBDataNote.signature });
    expect(responseB.status).toEqual(201);

    // Users interact on the blockchain, submitting transactions
    await server.blockchain.submitTx([userADataNote.noteData], [userANullifierNote.noteData]);
    await server.blockchain.submitTx([userBDataNote.noteData], [userBNullifierNote.noteData]);

    // Users later seek to retrieve their notes easily
    const userARead = await request(api)
      .post('/api/GET/account/notes')
      .send({ id: userADataNote.id, signature: userADataNote.signature, message: userADataNote.message });

    // Have to check multiple possible assertions, due to undefined processing order of data and nullifier
    expect(userARead.body[0].blockNum).toEqual(0);
    expect([true, false]).toContain(userARead.body[0].nullifier);
    expect([userADataNote.id, userANullifierNote.id]).toContain(userARead.body[0].owner);

    expect(userARead.body[1].blockNum).toEqual(0);
    expect([true, false]).toContain(userARead.body[1].nullifier);
    expect([userANullifierNote.id, userADataNote.id]).toContain(userARead.body[1].owner);

    const userBRead = await request(api)
      .post('/api/GET/account/notes')
      .send({ id: userBDataNote.id, signature: userBDataNote.signature, message: userBDataNote.message });

    expect(userBRead.body[0].blockNum).toEqual(1);
    expect([true, false]).toContain(userBRead.body[0].nullifier);
    expect([userBDataNote.id, userBNullifierNote.id]).toContain(userBRead.body[0].owner);

    expect(userBRead.body[1].blockNum).toEqual(1);
    expect([true, false]).toContain(userBRead.body[1].nullifier);
    expect([userBNullifierNote.id, userBDataNote.id]).toContain(userBRead.body[1].owner);
  });
});
