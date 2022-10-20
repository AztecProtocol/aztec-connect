import { createDebugLogger, enableLogs } from '@aztec/barretenberg/log';
import EventEmitter from 'events';
import { CoreSdkSerializedInterface, SdkEvent } from '../../core_sdk/index.js';
import { JobQueue } from '../job_queue/index.js';
import { createDispatchFn, DispatchMsg } from '../transport.js';
import { ChocolateCoreSdkOptions } from './chocolate_core_sdk_options.js';
import { createChocolateCoreSdk } from './create_chocolate_core_sdk.js';

const debug = createDebugLogger('aztec:sdk:shared_worker_backend');

export interface SharedWorkerBackend extends EventEmitter {
  on(name: 'dispatch_msg', handler: (msg: DispatchMsg) => void): this;
  emit(name: 'dispatch_msg', payload: DispatchMsg): boolean;
}

export class SharedWorkerBackend extends EventEmitter {
  private jobQueue = new JobQueue();
  private coreSdk!: CoreSdkSerializedInterface;
  private initPromise!: Promise<void>;

  constructor() {
    super();
  }

  public async initComponents(options: ChocolateCoreSdkOptions) {
    if (!this.initPromise) {
      this.initPromise = this.initComponentsInternal(options);
    }
    await this.initPromise;
  }

  private async initComponentsInternal(options: ChocolateCoreSdkOptions) {
    if (options.debug) {
      enableLogs(options.debug);
    }

    this.jobQueue.on('new_job', () => {
      // SharedWorkerFrontend has corresponding jobQueueDispatch method.
      this.emit('dispatch_msg', {
        fn: 'jobQueueDispatch',
        args: [{ fn: 'emit', args: ['new_job'] }],
      });
    });

    this.coreSdk = await createChocolateCoreSdk(this.jobQueue, options);

    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.coreSdk.on(event, (...args: any[]) => {
        this.emit('dispatch_msg', {
          fn: 'coreSdkDispatch',
          args: [{ fn: 'emit', args: [event, ...args] }],
        });
      });
    }
  }

  public jobQueueDispatch = createDispatchFn(this, 'jobQueue', debug);
  public coreSdkDispatch = createDispatchFn(this, 'coreSdk', debug);
}
