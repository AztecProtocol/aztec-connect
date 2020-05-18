import request from 'supertest';
import { createConnection } from 'typeorm';

import { appFactory } from '../dest/app';

describe('basic route tests', () => {
    let api: any;
    let server: any;
    let connection: any;

    beforeEach(async () => {
        // connection = await createConnection();

        const app = appFactory('/api');
        api = app.listen();
    });

    afterEach(async () => {
        api.close();
    });

    it('get home route GET /', async () => {
        const response = await request(api).get('/api');
        expect(response.status).toEqual(200);
        expect(response.text).toContain('OK');
    });

    it('should save information key', async () => {
        const informationKey = '0x01';
        const response = await request(api).post('/api/account/new');
        expect(response.status).toEqual(201);
        
        expect(response.text).toContain('OK');

        // TODO: check state update in database
    });


});