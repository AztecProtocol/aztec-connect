import { Crs } from '@aztec/barretenberg/crs';
import { PooledPedersen } from '@aztec/barretenberg/crypto';
import { PooledFftFactory } from '@aztec/barretenberg/fft';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { PooledNoteDecryptor } from '@aztec/barretenberg/note_algorithms';
import { PooledPippenger } from '@aztec/barretenberg/pippenger';
import { createDispatchProxyFromFn } from '@aztec/barretenberg/transport';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { CoreSdkClientStub, CoreSdkSerializedInterface, CoreSdkServerStub } from '../../core_sdk/index.js';
import { getNumWorkers } from '../../get_num_workers/index.js';
import { JobQueueDispatch, JobQueueInterface, JobQueueWorker } from '../job_queue/index.js';
import { createDispatchFn, TransportClient } from '../transport.js';
import { BananaCoreSdkOptions } from './banana_core_sdk_options.js';

const debug = createDebugLogger('aztec:sdk:shared_worker_frontend');

// Implements the serialized core sdk interface.
// Creates a CoreSdkSerializedInterface that forwards to SharedWorkerBackend.
// The 'coreSdkDispatch' function on SharedWorkerBackend is evoked.
function createBananaSharedWorkerProxy(
  transportClient: TransportClient,
  jobQueueWorker: JobQueueWorker,
  workerPool: WorkerPool,
): CoreSdkSerializedInterface {
  // Create a dispatch proxy matching CoreSdkServerStub's methods
  // and passing them along with our transport client
  const coreSdk = createDispatchProxyFromFn(CoreSdkServerStub, (fn: string) => (...args: any[]) => {
    debug(`core sdk dispatch request: ${fn}(${args})`);
    return transportClient.request({ fn: 'coreSdkDispatch', args: [{ fn, args }] });
  });
  // Wrap the original destroy, adding cleanup
  const origDestroy = coreSdk.destroy;
  coreSdk.destroy = async () => {
    debug('Destroying banana core sdk...');
    await jobQueueWorker.stop();
    await workerPool.destroy();
    await origDestroy();
    debug('Banana core sdk destroyed.');
  };
  return coreSdk;
}

export class SharedWorkerFrontend {
  private jobQueue!: JobQueueInterface;
  private coreSdk!: CoreSdkSerializedInterface;

  constructor(private transportClient: TransportClient) {}

  public async initComponents(options: BananaCoreSdkOptions) {
    // All calls on JobQueueDispatch will be sent to jobQueueDispatch function on SharedWorkerBackend.
    this.jobQueue = new JobQueueDispatch(msg => {
      debug(`job queue dispatch request: ${msg.fn}(${msg.args})`);
      return this.transportClient.request({ fn: 'jobQueueDispatch', args: [msg] });
    });

    const { numWorkers = getNumWorkers() } = options;
    const barretenberg = await BarretenbergWasm.new();
    const workerPool = await WorkerPool.new(barretenberg, numWorkers);
    const noteDecryptor = new PooledNoteDecryptor(workerPool);
    const pedersen = new PooledPedersen(barretenberg, workerPool);
    const pippenger = new PooledPippenger(workerPool);
    const fftFactory = new PooledFftFactory(workerPool);

    const jobQueueWorker = new JobQueueWorker(this.jobQueue, noteDecryptor, pedersen, pippenger, fftFactory);
    const crsData = await this.getCrsData();
    await jobQueueWorker.init(crsData);
    debug('starting job queue worker...');
    jobQueueWorker.start();

    // Event messages from the SharedWorkerBackend are dispatch messages (that call emit on their targets).
    this.transportClient.on('event_msg', ({ fn, args }) => this[fn](...args));

    // Call `init` on the SharedWorkerBackend. Constructs and initializes the chocolate core sdk.
    await this.transportClient.request({ fn: 'initComponents', args: [options] });

    const transportClient = this.transportClient;
    // All calls on BananaCoreSdk will be sent to coreSdkDispatch function on SharedWorkerBackend.
    this.coreSdk = createBananaSharedWorkerProxy(transportClient, jobQueueWorker, workerPool);

    return { coreSdk: new CoreSdkClientStub(this.coreSdk) };
  }

  public jobQueueDispatch = createDispatchFn(this, 'jobQueue', debug);
  public coreSdkDispatch = createDispatchFn(this, 'coreSdk', debug);

  private async getCrsData() {
    const circuitSize = 2 ** 16;
    debug(`downloading crs data (circuit size: ${circuitSize})...`);
    const crs = new Crs(circuitSize);
    await crs.init();
    debug('done.');
    return Buffer.from(crs.getData());
  }
}
