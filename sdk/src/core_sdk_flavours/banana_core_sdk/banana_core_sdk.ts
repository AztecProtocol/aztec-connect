import { WorkerPool } from '@aztec/barretenberg/wasm';
import createDebug from 'debug';
import { CoreSdkDispatch } from '../../core_sdk';
import { SdkEvent } from '../../core_sdk/sdk_status';
import { JobQueueFrontend } from '../job_queue';
import { DispatchMsg } from '../transport';

const debug = createDebug('bb:banana_core_sdk');

export class BananaCoreSdk extends CoreSdkDispatch {
  constructor(
    dispatch: (msg: DispatchMsg) => Promise<any>,
    private jobQueue: JobQueueFrontend,
    private workerPool: WorkerPool,
  ) {
    super(dispatch);
  }

  public async run() {
    await super.run();

    // To improve run performance, the following can be running asynchronously.
    const fn = async () => {
      const crsData = await this.getCrsData();
      await this.jobQueue.init(crsData);
      this.jobQueue.start();
    };

    fn().catch(err => {
      debug(err.message);
      this.destroy();
    });
  }

  public async destroy() {
    // We don't actually destroy a remote sdk. Just emit the destroy event to perform any cleanup.
    debug('Destroying banana core sdk...');
    await this.jobQueue?.stop();
    await this.workerPool.destroy();
    this.emit(SdkEvent.DESTROYED);
    debug('Banana core sdk destroyed.');
  }
}
