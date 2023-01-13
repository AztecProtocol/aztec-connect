import { PooledPedersen, SinglePedersen } from '@aztec/barretenberg/crypto';
import { PooledFftFactory, SingleFftFactory } from '@aztec/barretenberg/fft';
import { PooledPippenger, SinglePippenger } from '@aztec/barretenberg/pippenger';
import { ServerRollupProvider } from '@aztec/barretenberg/rollup_provider';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { PooledNoteDecryptor, SingleNoteDecryptor } from '@aztec/barretenberg/note_algorithms';
import isNode from 'detect-node';
import { mkdirSync } from 'fs';
import { default as levelup, LevelUp } from 'levelup';
import { CoreSdk, CoreSdkOptions } from '../../core_sdk/index.js';
import { DexieDatabase, SQLDatabase } from '../../database/index.js';
import { getDeviceMemory, getNumCpu, getNumWorkers } from '../../get_num_workers/index.js';
import { SDK_VERSION } from '../../version.js';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { default as memdown } from 'memdown';
import { levelUpNodeFactory } from './node/index.js';
import { levelUpWebFactory } from './browser/index.js';

const debug = createDebugLogger('bb:create_vanilla_core_sdk');

export function getLevelDb(memoryDb = false, identifier?: string): LevelUp {
  if (isNode) {
    const folder = identifier ? `/${identifier}` : '';
    const dbPath = `./data${folder}`;
    if (memoryDb) {
      return levelup(memdown());
    } else {
      mkdirSync(dbPath, { recursive: true });
      return levelUpNodeFactory(`${dbPath}/aztec2-sdk.db`);
    }
  } else {
    return levelUpWebFactory(`aztec2-sdk`);
  }
}

export async function getDb(memoryDb = false, identifier?: string) {
  if (isNode) {
    return await SQLDatabase.getDb(memoryDb, identifier);
  } else {
    return new DexieDatabase();
  }
}

export interface VanillaCoreSdkOptions extends CoreSdkOptions {
  memoryDb?: boolean; // node only
  identifier?: string; // node only
  numWorkers?: number;
}

/**
 * Construct a vanilla version of the CodeSdk.
 * This is used in backend node apps.
 * Dapps should use either strawberry or chocolate.
 */
export async function createVanillaCoreSdk(options: VanillaCoreSdkOptions) {
  const { numWorkers = getNumWorkers() } = options;

  if (numWorkers === 0) {
    debug('creating workerless vanilla core sdk...');
    return createWorkerlessSdk(options);
  }

  debug('creating pooled vanilla core sdk...');
  debug(`cpu: ${getNumCpu()}, workers: ${numWorkers}, memory: ${getDeviceMemory()}`);
  const wasm = await BarretenbergWasm.new('main');
  const workerPool = await WorkerPool.new(wasm, numWorkers);
  const noteDecryptor = new PooledNoteDecryptor(workerPool);
  const pedersen = new PooledPedersen(wasm, workerPool);
  const pippenger = new PooledPippenger(workerPool);
  const fftFactory = new PooledFftFactory(workerPool);
  const { memoryDb, identifier, serverUrl, pollInterval, noVersionCheck } = options;

  const leveldb = getLevelDb(memoryDb, identifier);
  const db = await getDb(memoryDb, identifier);

  const host = new URL(serverUrl);
  const rollupProvider = new ServerRollupProvider(host, pollInterval, noVersionCheck ? undefined : SDK_VERSION);

  const coreSdk = new CoreSdk(
    leveldb,
    db,
    rollupProvider,
    wasm,
    noteDecryptor,
    pedersen,
    pippenger,
    fftFactory,
    workerPool,
  );
  await coreSdk.init(options);
  return coreSdk;
}

async function createWorkerlessSdk(options: VanillaCoreSdkOptions) {
  const wasm = await BarretenbergWasm.new('main');
  const noteDecryptor = new SingleNoteDecryptor(wasm);
  const pedersen = new SinglePedersen(wasm);
  const pippenger = new SinglePippenger(wasm);
  const fftFactory = new SingleFftFactory(wasm);
  const { memoryDb, identifier, serverUrl, pollInterval, noVersionCheck } = options;

  const leveldb = getLevelDb(memoryDb, identifier);
  const db = await getDb(memoryDb, identifier);

  const host = new URL(serverUrl);
  const rollupProvider = new ServerRollupProvider(host, pollInterval, noVersionCheck ? undefined : SDK_VERSION);

  const coreSdk = new CoreSdk(leveldb, db, rollupProvider, wasm, noteDecryptor, pedersen, pippenger, fftFactory);
  await coreSdk.init(options);
  return coreSdk;
}
