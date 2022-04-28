import { PooledPedersen } from '@aztec/barretenberg/crypto';
import { createLogger } from '@aztec/barretenberg/debug';
import { PooledFftFactory } from '@aztec/barretenberg/fft';
import { PooledPippenger } from '@aztec/barretenberg/pippenger';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { CoreSdkClientStub, CoreSdkSerializedInterface, SdkEvent } from '../../core_sdk';
import { getNumWorkers } from '../get_num_workers';
import { JobQueueDispatch, JobQueueInterface, JobQueueWorker } from '../job_queue';
import { createDispatchFn, TransportClient } from '../transport';
import { BananaCoreSdk } from './banana_core_sdk';
import { BananaCoreSdkOptions } from './banana_core_sdk_options';

const debug = createLogger('aztec:sdk:shared_worker_frontend');

export class SharedWorkerFrontend {
  private jobQueue!: JobQueueInterface;
  private coreSdk!: CoreSdkSerializedInterface;

  constructor(private transportClient: TransportClient) {}

  public async initComponents(options: BananaCoreSdkOptions) {
    // Call `init` on the SharedWorkerBackend. Constructs and initializes the chocolate core sdk.
    await this.transportClient.request({ fn: 'initComponents', args: [options] });

    const { numWorkers = getNumWorkers() } = options;
    const barretenberg = await BarretenbergWasm.new();
    const workerPool = await WorkerPool.new(barretenberg, numWorkers);
    const pedersen = new PooledPedersen(barretenberg, workerPool);
    const pippenger = new PooledPippenger(workerPool);
    const fftFactory = new PooledFftFactory(workerPool);

    // All calls on JobQueueDispatch will be sent to jobQueueDispatch function on SharedWorkerBackend.
    this.jobQueue = new JobQueueDispatch(msg => {
      debug(`job queue dispatch request: ${msg.fn}(${msg.args})`);
      return this.transportClient.request({ fn: 'jobQueueDispatch', args: [msg] });
    });

    const jobQueueWorker = new JobQueueWorker(this.jobQueue, pedersen, pippenger, fftFactory);

    // All calls on BananaCoreSdk will be sent to coreSdkDispatch function on SharedWorkerBackend.
    this.coreSdk = new BananaCoreSdk(
      msg => {
        debug(`core sdk dispatch request: ${msg.fn}(${msg.args})`);
        return this.transportClient.request({ fn: 'coreSdkDispatch', args: [msg] });
      },
      jobQueueWorker,
      workerPool,
    );

    this.coreSdk.on(SdkEvent.DESTROYED, () => this.transportClient.close());

    // Event messages from the SharedWorkerBackend are dispatch messages (that call emit on their targets).
    this.transportClient.on('event_msg', ({ fn, args }) => this[fn](...args));

    return { coreSdk: new CoreSdkClientStub(this.coreSdk) };
  }

  public jobQueueDispatch = createDispatchFn(this, 'jobQueue', debug);
  public coreSdkDispatch = createDispatchFn(this, 'coreSdk', debug);
}
