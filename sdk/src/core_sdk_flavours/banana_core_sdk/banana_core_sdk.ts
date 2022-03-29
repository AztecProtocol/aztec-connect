import { Crs } from '@aztec/barretenberg/crs';
import { WorkerPool } from '@aztec/barretenberg/wasm';
import createDebug from 'debug';
import { CoreSdkDispatch } from '../../core_sdk';
import { SdkEvent } from '../../core_sdk/sdk_status';
import { JobQueueWorker } from '../job_queue';
import { DispatchMsg } from '../transport';

const debug = createDebug('bb:banana_core_sdk');

export class BananaCoreSdk extends CoreSdkDispatch {
  constructor(
    dispatch: (msg: DispatchMsg) => Promise<any>,
    private jobQueueWorker: JobQueueWorker,
    private workerPool: WorkerPool,
  ) {
    super(dispatch);
  }

  public async run() {
    await super.run();

    // To improve run performance, the following can be running asynchronously.
    const fn = async () => {
      const crsData = await this.getCrsData(2 ** 16);
      await this.jobQueueWorker.init(crsData);
      debug('starting job queue worker...');
      this.jobQueueWorker.start();
    };

    fn().catch(err => {
      debug(err.message);
      this.destroy();
    });
  }

  public async destroy() {
    // We don't actually destroy a remote sdk. Just emit the destroy event to perform any cleanup.
    debug('Destroying banana core sdk...');
    await this.jobQueueWorker?.stop();
    await this.workerPool.destroy();
    this.emit(SdkEvent.DESTROYED);
    debug('Banana core sdk destroyed.');
  }

  private async getCrsData(circuitSize: number) {
    debug('downloading crs data...');
    const crs = new Crs(circuitSize);
    await crs.download();
    debug('done.');
    return Buffer.from(crs.getData());
  }
}
