import 'fake-indexeddb/auto';
import { mocked } from 'ts-jest/utils';
import request from 'supertest';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { toBufferBE, toBigIntBE } from 'bigint-buffer';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { EventEmitter } from 'events';
import { nullifierBufferToIndex } from 'barretenberg/client_proofs/join_split_proof';
import Server from './server';

import { WorldStateDb } from './world_state_db';

jest.mock('./world_state_db');
const MockedWorldStateDb = <jest.Mock<WorldStateDb>>WorldStateDb;
const mockedWorldStateDb = <jest.Mocked<WorldStateDb>>new MockedWorldStateDb();

EventEmitter.defaultMaxListeners = 30;

import { appFactory } from './api';
import { Blake2s } from 'barretenberg/crypto/blake2s';

const getNulliferHex = async () => {
  const barretenberg = await BarretenbergWasm.new();
  const blake2s = new Blake2s(barretenberg);
  const nullifierBigInt = BigInt(Math.floor(Math.random() * 1000000)).toString(10);
  const nullifierBuf = Buffer.from(nullifierBigInt);
  const nullifierHash = blake2s.hashToField(new Uint8Array(nullifierBuf));
  return `0x${nullifierBufferToIndex(Buffer.from(nullifierHash)).toString(16)}`;
};

describe('Route tests', () => {
  let api: any;
  let server: Server;

  beforeAll(async () => {
    server = new Server(mockedWorldStateDb);
    jest.mock('./world_state_db');

    await server.start();
    const app = appFactory(server, '/api');
    api = app.listen(8080);
  });
  beforeEach(async () => {});

  afterEach(async () => {
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await server.stop();
    api.close();
  });

  describe('Success cases', () => {
    it('should return true if the queue is empty', async () => {
      const res = await (request(api) as any).get('/api/status');

      expect(res.body).toHaveProperty('itemsRemaining');
    });

    it('should call the world state db sequentially', async () => {
      const nullifier1Hex = await getNulliferHex();
      const nullifier2Hex = await getNulliferHex();
      const res = await (request(api) as any).get(`/api/getSequentialPaths/${nullifier1Hex}/${nullifier2Hex}`);

      expect(mocked(server.worldState.put).mock.calls).toHaveLength(2);

      expect(mocked(server.worldState.getHashPath).mock.calls).toHaveLength(4);
      expect(mocked(server.worldState.put).mock.calls[0][1]).toEqual(
        mocked(server.worldState.getHashPath).mock.calls[0][1],
      );
      expect(mocked(server.worldState.put).mock.calls[0][1]).toEqual(
        mocked(server.worldState.getHashPath).mock.calls[1][1],
      );
      expect(mocked(server.worldState.put).mock.calls[1][1]).toEqual(
        mocked(server.worldState.getHashPath).mock.calls[2][1],
      );
      expect(mocked(server.worldState.put).mock.calls[1][1]).toEqual(
        mocked(server.worldState.getHashPath).mock.calls[3][1],
      );
    });

    it('should call the world state and fetch the hash path for a given index', async () => {
      const nullifier1Hex = await getNulliferHex();
      const res = await (request(api) as any).get(`/api/getHashPath/${nullifier1Hex}`);
      expect(mocked(server.worldState.getHashPath).mock.calls).toHaveLength(1);
    });
  });
});
