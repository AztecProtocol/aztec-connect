import request from 'supertest';
import { randomBytes } from 'crypto';

import { Schnorr } from 'barretenberg/crypto/schnorr';
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

function makeReq(server: Server, api: any, userPrivateKey: Buffer) {
    async function req(verb: string, route: string, body: any) {
        const message = `${(Date.now()).toString(10)}${randomHex(8)}`;
        const signature = sign(server.schnorr, message, userPrivateKey);

        return (<any>request(api))[verb](route)
            .set('x-signature', signature)
            .set('x-message', message)
            .send(body);
    }
    return req;
}


describe('Route tests', () => {
    let api: any;
    let server: Server;
    let id: string;
    let informationKey: string;
    let pubKey: string;
    let req: Function;
    const privateKey = randomBytes(32);

    beforeEach(async () => {
        server = new Server();

        await server.start();
        const app = appFactory(server, '/api');
        api = app.listen();

        req = makeReq(server, api, privateKey);
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
            const writeResponse = await req('post', '/api/account/new', { id, informationKey });
            expect(writeResponse.status).toEqual(201);

            // Simulate action of blockchain server - store some notes in the database

            const noteA = createNote(server.grumpkin, privateKey);
            const noteB = createNote(server.grumpkin, privateKey);

            const userNotes = [noteA, noteB];

            const waitOnBlockProcessed = createWaitOnBlockProcessed(server);
            const block = await server.blockchain.submitTx(userNotes, []);

            await waitOnBlockProcessed;
            const readResponse = await req('get', `/api/account/${id}/notes`);

            expect(readResponse.status).toEqual(200);
            expect(readResponse.body.length).toEqual(2);
            expect(readResponse.body[0].blockNum).toEqual(block.blockNum);
            expect(readResponse.body[0].owner).toEqual(id);
            expect(readResponse.body[1].blockNum).toEqual(block.blockNum);
            expect(readResponse.body[1].owner).toEqual(id);
        });

        it('should create account with ID and informationKey', async () => {
            const response = await req('post', '/api/account/new', { id, informationKey });
            expect(response.status).toEqual(201);
            expect(response.text).toContain('Created');

            const retrievedData = await server.keyDb.findById(id);
            expect(retrievedData.id).toEqual(pubKey);
            expect(retrievedData.informationKey).toEqual(informationKey);
        });

        it('should update key associated with a user account', async () => {
            const response = await req('post', '/api/account/new', { id, informationKey });
            expect(response.status).toEqual(201);

            // updateKey
            const newInformationKey = randomHex(20);
            const updateResponse = await req('put', `/api/account/${id}`, { id, newInformationKey });
            expect(updateResponse.status).toEqual(200);

            const updatedKey = await server.keyDb.findById(id);
            expect(updatedKey.id).toEqual(id);
            expect(updatedKey.informationKey).toEqual(newInformationKey);
        });
    });

    describe('Failure cases', () => {
        it('should fail to write informationKey for malformed ID', async () => {
            const malformedID = 'ZYtj';

            const response = await req('post', '/api/account/new', { id: malformedID, informationKey: privateKey.toString('hex') });
            expect(response.status).toEqual(400);
            expect(response.text).toContain('Fail');
        });

        it('should fail to overwrite user information key with non-user signature', async () => {
            await req('post', '/api/account/new', { id, informationKey: privateKey.toString('hex') });

            const maliciousInformationKey = '01';
            const message = `${(Date.now()).toString(10)}${randomHex(8)}`;
            const signature = sign(server.schnorr, message, privateKey);

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

        it('should fail to with re-used signature', async () => {
            const message = `${(Date.now()).toString(10)}${randomHex(8)}`;
            const signature = sign(server.schnorr, message, privateKey);

            const responseLegitimate = await request(api).post('/api/account/new')
                .set('x-signature', signature)
                .set('x-message', message)
                .send({ id, informationKey });
            expect(responseLegitimate.status).toEqual(201);

            const response = await request(api).put(`/api/account/${id}`)
                .set('x-signature', signature)
                .set('x-message', message)
                .send({ id, informationKey });
            expect(response.status).toEqual(401);
            expect(response.text).toContain('Unauthorized');
        });
    });
});
