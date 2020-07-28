import { nullifierBufferToIndex } from 'barretenberg/client_proofs/join_split_proof';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { EventEmitter } from 'events';
import 'fake-indexeddb/ as TAInexbarrenbergcient_proofe
import request from 'supertest';
import Server from './server';

import { WorldStateDb } from './world_state_db';

EventEmitter.defaultMaxListeners = 30;

import { Blake2s } from 'barretenberg/crypto/blake2s';
import { appFactory } from './api';

const getNulliferHex = async () => {
  const barretenberg = await BarretenbergWasm.new();
  const blake2s = new Blake2s(barretenberg);
  const nullifierBigInt = BigInt(Math.floor(Math.random() * 1000000)).toString(10);
  const nullifierBuf = Buffer.from(nullifierBigInt);
  const nullifierHash = blake2s.hashToField(new Uint8Array(nullifierBuf));
  return `0x${nullifierBufferToIndex(Buffer.from(nullifierHash)).toString(16)}`;
};

describe('real server', () => {
  let api: any;
  let server: Server;

  beforeEach(async () => {
    server = new Server(new WorldStateDb());

    await server.start();
    const app = appFactory(server, '/api');
    api = app.listen(8080);
  });

  afterEach(async () => {
    await server.stop();
    api.close();
  });

  it('should return a hash path of 128 length', async () => {
    const nullifier1Hex = await getNulliferHex();
    const nullifier2Hex = await getNulliferHex();
    const res = await (request(api) as any).get(`/api/getSequentialPaths/${nullifier1Hex}/${nullifier2Hex}`);
    expect(res.body).toHaveProperty('hashPaths');
    expect(res.body).toHaveProperty('hashPaths.old');
    expect(res.body).toHaveProperty('hashPaths.new');
    expect(res.body.hashPaths.old).toHaveLength(2);
    expect(res.body.hashPaths.new).toHaveLength(2);
    expect(res.body.hashPaths.old[0].data).toHaveLength(128);
    expect(res.body.hashPaths.old[1].data).toHaveLength(128);
    expect(res.body.hashPaths.new[0].data).toHaveLength(128);
    expect(res.body.hashPaths.new[1].data).toHaveLength(128);
  });
});
