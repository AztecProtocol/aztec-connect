import { PooledPedersen, SinglePedersen } from '@aztec/barretenberg/crypto';
import { PooledFftFactory, SingleFftFactory } from '@aztec/barretenberg/fft';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { PooledNoteDecryptor, SingleNoteDecryptor } from '@aztec/barretenberg/note_algorithms';
import { PooledPippenger, SinglePippenger } from '@aztec/barretenberg/pippenger';
import { ServerRollupProvider } from '@aztec/barretenberg/rollup_provider';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { getDb } from '../database/index.js';
import { getDeviceMemory, getNumCpu, getNumWorkers } from '../get_num_workers/index.js';
import { getLevelDb } from '../level_db/index.js';
import { SDK_VERSION } from '../version.js';
import { CoreSdk, CoreSdkOptions } from './index.js';

const debug = createDebugLogger('bb:create_vanilla_core_sdk');

export interface CreateCoreSdkOptions extends CoreSdkOptions {
  memoryDb?: boolean; // node only
  identifier?: string; // node only
  numWorkers?: number;
}

/**
 * Construct a vanilla version of the CodeSdk.
 * This is used in backend node apps.
 * Dapps should use either strawberry or chocolate.
 */
export async function createCoreSdk(options: CreateCoreSdkOptions) {
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

  const leveldb = getLevelDb('aztec2-sdk', memoryDb, identifier);
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

async function createWorkerlessSdk(options: CreateCoreSdkOptions) {
  const wasm = await BarretenbergWasm.new('main');
  const noteDecryptor = new SingleNoteDecryptor(wasm);
  const pedersen = new SinglePedersen(wasm);
  const pippenger = new SinglePippenger(wasm);
  const fftFactory = new SingleFftFactory(wasm);
  const { memoryDb, identifier, serverUrl, pollInterval, noVersionCheck } = options;

  const leveldb = getLevelDb('aztec2-sdk', memoryDb, identifier);
  const db = await getDb(memoryDb, identifier);

  const host = new URL(serverUrl);
  const rollupProvider = new ServerRollupProvider(host, pollInterval, noVersionCheck ? undefined : SDK_VERSION);

  const coreSdk = new CoreSdk(leveldb, db, rollupProvider, wasm, noteDecryptor, pedersen, pippenger, fftFactory);
  await coreSdk.init(options);
  return coreSdk;
}
