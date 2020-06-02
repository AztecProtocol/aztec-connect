import request from 'supertest';
import { randomBytes } from 'crypto';

import { Schnorr } from 'barretenberg/crypto/schnorr';
import { Note } from './entity/Note';
import { Key } from './entity/Key';
import { appFactory } from './app';

import Server from './server';
import { randomHex, createNote } from './helpers';
import { TextEncoder } from 'util';

function sign(schnorr: Schnorr, message: string, privateKey: Uint8Array) {
    let signature = schnorr.constructSignature(new TextEncoder().encode(message), privateKey);
    return (<string[]>Object.values(signature).reduce((acc: any, comp: any) => {
        acc.push(comp.toString('hex'));
        return acc
    }, [])).join(';');
}

async function createWaitOnBlockProcessed(server: Server) {
    return new Promise((resolve, reject) => {
        server.on('block-processed', resolve);
    });
}

describe('Route tests', () => {
    let api: any;
    let server: Server;
    let signature: any;
    let id: string;
    let informationKey: string;
    let message: string;
    let pubKey: string;
    const privateKey = randomBytes(32);

    beforeEach(async () => {
        server = new Server();

        await server.start();
        const app = appFactory(server, '/api');
        api = app.listen();

        message = (Date.now()).toString(10);
        signature = sign(server.schnorr, message, privateKey);
        pubKey = server.schnorr.computePublicKey(privateKey).toString('hex');
        id = pubKey;
        informationKey = privateKey.toString('hex');
    });

    afterEach(async () => {
        await server.stop();
        await api.close();
    });

    describe('Success cases', () => {
        it('should get the notes associated with a user account', async () => {
            // create the user's account
            const writeResponse = await request(api)
                .post('/api/account/new')
                .set('x-signature', signature)
                .set('x-message', message)
                .send({ id, informationKey });
            expect(writeResponse.status).toEqual(201);

            // Simulate action of blockchain server - store some notes in the database

            const noteA = createNote(server.grumpkin, privateKey);
            const noteB = createNote(server.grumpkin, privateKey);

            const userNotes = [noteA, noteB];

            const waitOnBlockProcessed = createWaitOnBlockProcessed(server);
            const block = await server.blockchain.submitTx(userNotes, []);

            await waitOnBlockProcessed;
            const readResponse = await request(api)
                .get(`/api/account/${id}/notes`)
                .set('x-signature', signature)
                .set('x-message', message);

            expect(readResponse.status).toEqual(200);
            expect(readResponse.body.length).toEqual(2);
            expect(readResponse.body[0].blockNum).toEqual(block.blockNum);
            expect(readResponse.body[0].owner).toEqual(id);
            expect(readResponse.body[1].blockNum).toEqual(block.blockNum);
            expect(readResponse.body[1].owner).toEqual(id);
        });

        it('get home route GET /', async () => {
            const response = await request(api).get('/api');
            expect(response.status).toEqual(200);
            expect(response.text).toContain('OK');
        });

        it('should create account with ID and informationKey', async () => {
            const response = await request(api)
                .post('/api/account/new')
                .set('x-signature', signature)
                .set('x-message', message)
                .send({ id: pubKey, informationKey });
            expect(response.status).toEqual(201);
            expect(response.text).toContain('Created');

            const repository = server.connection.getRepository(Key);
            const retrievedData = await repository.findOne({ id: pubKey });
            expect(retrievedData!.id).toEqual(pubKey);
            expect(retrievedData!.informationKey[0]).toEqual(informationKey[0]);
        });

        it('should update key associated with a user account', async () => {
            const keyRepo = server.connection.getRepository(Key);

            const response = await request(api)
                .post('/api/account/new')
                .set('x-signature', signature)
                .set('x-message', message)
                .send({ id, informationKey: privateKey.toString('hex') });
            expect(response.status).toEqual(201);

            // updateKey
            const newInformationKey = randomHex(20);
            const updateResponse = await request(api)
                .put(`/api/account/${id}`)
                .set('x-signature', signature)
                .set('x-message', message)
                .send({ id, newInformationKey });
            expect(updateResponse.status).toEqual(200);

            const updatedKey = await keyRepo.find({ where: { id } });
            expect(updatedKey[0].id).toEqual(id);
            expect(updatedKey[0].informationKey).toEqual(newInformationKey);
        });
    });

    describe('Failure cases', () => {
        it('should fail to write informationKey for malformed ID', async () => {
            const malformedID = 'ZYtj';

            const response = await request(api)
                .post('/api/account/new')
                .set('x-signature', signature)
                .set('x-message', message)
                .send({ id: malformedID, informationKey: privateKey.toString('hex') });
            expect(response.status).toEqual(400);
            expect(response.text).toContain('Fail');
        });

        it('should fail to overwrite user information key with non-user signature', async () => {
            await request(api)
                .put('/api/account/new')
                .send({ id, informationKey, message, signature });

            const maliciousInformationKey = '01';

            // mutate the signature
            const [s, e] = signature.split(';');
            const wrongSig = [Buffer.from(randomBytes(32)).toString('hex'), e].join(';');

            const response = await request(api).put(`/api/account/${id}`)
                .set('x-signature', wrongSig)
                .set('x-message', message)
                .send({ id, maliciousInformationKey });
            expect(response.status).toEqual(401);
            expect(response.text).toContain('Unauthorized');
        });
    });
});
