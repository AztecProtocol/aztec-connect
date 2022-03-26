import { PooledPedersen } from '@aztec/barretenberg/crypto';
import { PooledFftFactory } from '@aztec/barretenberg/fft';
import { PooledPippenger } from '@aztec/barretenberg/pippenger';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { CoreSdkClientStub, SdkEvent } from '../../core_sdk';
import { CoreSdkSerializedInterface } from '../../core_sdk/core_sdk_serialized_interface';
import { getNumWorkers } from '../get_num_workers';
import { JobQueueDispatch, JobQueueFrontend } from '../job_queue';
import { DispatchMsg, TransportClient } from '../transport';
import { BananaCoreSdk } from './banana_core_sdk';
import { BananaCoreSdkOptions } from './banana_core_sdk_options';

export class ServiceWorkerFrontend {
  private jobQueue!: JobQueueFrontend;
  private coreSdk!: CoreSdkSerializedInterface;

  constructor(private transportClient: TransportClient) {}

  public async initComponents(options: BananaCoreSdkOptions) {
    // Call `init` on the ServiceWorkerBackend. Constructs and initializes the chocolate core sdk.
    await this.transportClient.request({ fn: 'initComponents', args: [options] });

    const { numWorkers = getNumWorkers() } = options;
    const barretenberg = await BarretenbergWasm.new();
    const workerPool = await WorkerPool.new(barretenberg, numWorkers);
    const pedersen = new PooledPedersen(barretenberg, workerPool);
    const pippenger = new PooledPippenger(workerPool);
    const fftFactory = new PooledFftFactory(workerPool);

    // All calls on JobQueueDispatch will be sent to jobQueueDispatch function on ServiceWorkerBackend.
    const jobQueueDispatch = new JobQueueDispatch(msg =>
      this.transportClient.request({ fn: 'jobQueueDispatch', args: [msg] }),
    );

    this.jobQueue = new JobQueueFrontend(jobQueueDispatch, pedersen, pippenger, fftFactory);

    // All calls on BananaCoreSdk will be sent to coreSdkDispatch function on ServiceWorkerBackend.
    this.coreSdk = new BananaCoreSdk(
      msg => this.transportClient.request({ fn: 'coreSdkDispatch', args: [msg] }),
      this.jobQueue,
      workerPool,
    );

    this.coreSdk.on(SdkEvent.DESTROYED, () => this.transportClient.close());

    // Event messages from the ServiceWorkerBackend are dispatch messages (that call emit on their targets).
    this.transportClient.on('event_msg', ({ fn, args }) => this[fn](...args));

    return { coreSdk: new CoreSdkClientStub(this.coreSdk) };
  }

  public async jobQueueDispatch({ fn, args }: DispatchMsg) {
    return await this.jobQueue[fn](...args);
  }

  public async coreSdkDispatch({ fn, args }: DispatchMsg) {
    return await this.coreSdk[fn](...args);
  }
}
