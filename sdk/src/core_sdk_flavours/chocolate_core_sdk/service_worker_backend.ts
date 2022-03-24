import createDebug from 'debug';
import EventEmitter from 'events';
import { CoreSdkSerializedInterface, SdkEvent } from '../../core_sdk';
import { JobQueueBackend } from '../job_queue';
import { DispatchMsg } from '../transport';
import { ChocolateCoreSdkOptions, createChocolateCoreSdk } from './create_chocolate_core_sdk';

export interface ServiceWorkerBackend extends EventEmitter {
  on(name: 'dispatch_msg', handler: (msg: DispatchMsg) => void): this;
  emit(name: 'dispatch_msg', payload: DispatchMsg): boolean;
}

export class ServiceWorkerBackend extends EventEmitter {
  private jobQueue = new JobQueueBackend();
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
      createDebug.enable('bb:*');
    }

    this.coreSdk = await createChocolateCoreSdk(this.jobQueue, options);

    this.jobQueue.on('new_job', () => {
      // ServiceWorkerFrontend has corresponding jobQueueDispatch method.
      this.emit('dispatch_msg', {
        fn: 'jobQueueDispatch',
        args: [{ fn: 'emit', args: ['new_job'] }],
      });
    });

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

  public async jobQueueDispatch({ fn, args }: DispatchMsg) {
    return await this.jobQueue[fn](...args);
  }

  public async coreSdkDispatch({ fn, args }: DispatchMsg) {
    return await this.coreSdk[fn](...args);
  }
}
