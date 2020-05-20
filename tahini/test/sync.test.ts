import { Wallet, utils } from 'ethers';
import request from 'supertest';

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

  it('should successfully process transaction', async () => {
    await server.blockchain.submitTx([Buffer.from(randomHex(64))], [Buffer.from(randomHex(64))]);
  });
});
