import { createDebugLogger } from '@aztec/barretenberg/log';
import { WorkerPool } from '@aztec/barretenberg/wasm';
import { CoreSdkDispatch } from '../../core_sdk/index.js';
import { JobQueueWorker } from '../job_queue/index.js';
import { DispatchMsg } from '../transport.js';

const debug = createDebugLogger('bb:banana_core_sdk');

export class BananaCoreSdk extends CoreSdkDispatch {
  constructor(
    dispatch: (msg: DispatchMsg) => Promise<any>,
    private jobQueueWorker: JobQueueWorker,
    private workerPool: WorkerPool,
  ) {
    super(dispatch);
  }

  public async destroy() {
    debug('Destroying banana core sdk...');
    await this.jobQueueWorker?.stop();
    await this.workerPool.destroy();
    await super.destroy();
    debug('Banana core sdk destroyed.');
  }
}
