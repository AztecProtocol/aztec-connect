import { ServerRollupProvider } from '@aztec/barretenberg/rollup_provider';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { CoreSdkOptions, CoreSdkServerStub, CoreSdk } from '../../core_sdk';
import { getDb, getLevelDb } from '../vanilla_core_sdk';
import { JobQueue } from '../job_queue';
import { JobQueueFftFactory } from '../job_queue/job_queue_fft_factory';
import { JobQueuePedersen } from '../job_queue/job_queue_pedersen';
import { JobQueuePippenger } from '../job_queue/job_queue_pippenger';

export interface ChocolateCoreSdkOptions extends CoreSdkOptions {
  pollInterval?: number;
}

/**
 * Construct a chocolate version of the sdk.
 * This creates a CoreSdk for running in some remote context, e.g. a service worker.
 * It is wrapped in a network type adapter.
 * It is not interfaced with directly, but rather via a banana sdk, over some transport layer.
 */
export async function createChocolateCoreSdk(jobQueue: JobQueue, options: ChocolateCoreSdkOptions) {
  const wasm = await BarretenbergWasm.new();
  const pedersen = new JobQueuePedersen(wasm, jobQueue);
  const pippenger = new JobQueuePippenger(jobQueue);
  const fftFactory = new JobQueueFftFactory(jobQueue);
  const { pollInterval, serverUrl } = options;

  const leveldb = getLevelDb();
  const db = await getDb();
  await db.init();

  const host = new URL(serverUrl);
  const rollupProvider = new ServerRollupProvider(host, pollInterval);

  const coreSdk = new CoreSdk(leveldb, db, rollupProvider, wasm, pedersen, pippenger, fftFactory);
  await coreSdk.init(options);
  return new CoreSdkServerStub(coreSdk);
}
