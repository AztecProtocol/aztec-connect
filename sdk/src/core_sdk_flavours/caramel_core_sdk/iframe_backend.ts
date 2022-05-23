import { createLogger, enableLogs } from '@aztec/barretenberg/debug';
import EventEmitter from 'events';
import { SdkEvent } from '../../core_sdk';
import { BananaCoreSdkOptions } from '../banana_core_sdk';
import { createDispatchFn, DispatchMsg } from '../transport';
import { CaramelCoreSdk } from './caramel_core_sdk';
import { createCaramelCoreSdk } from './create_caramel_core_sdk';

const debug = createLogger('aztec:sdk:iframe_backend');

async function getServerUrl() {
  if (process.env.NODE_ENV === 'production') {
    const deployTag = await fetch('/DEPLOY_TAG', {})
      .then(resp => (!resp.ok ? '' : resp.text()))
      .catch(() => '');

    if (deployTag) {
      return `https://api.aztec.network/${deployTag}/falafel`;
    } else {
      return await fetch('/ROLLUP_PROVIDER_URL').then(resp => {
        if (!resp.ok) {
          throw new Error('Failed to fetch /ROLLUP_PROVIDER_URL.');
        }
        return resp.text();
      });
    }
  } else {
    return 'http://localhost:8081';
  }
}

export interface IframeBackend extends EventEmitter {
  on(name: 'dispatch_msg', handler: (msg: DispatchMsg) => void): this;
  emit(name: 'dispatch_msg', payload: DispatchMsg): boolean;
}

export class IframeBackend extends EventEmitter {
  private coreSdk!: CaramelCoreSdk;
  private initPromise!: Promise<void>;

  constructor(private origin: string) {
    super();
  }

  public async initComponents(options: BananaCoreSdkOptions) {
    if (!this.initPromise) {
      this.initPromise = this.initInternal(options);
    }
    await this.initPromise;
  }

  private async initInternal(options: BananaCoreSdkOptions) {
    if (options.debug) {
      enableLogs(options.debug);
    }

    const serverUrl = await getServerUrl();
    this.coreSdk = await createCaramelCoreSdk(this.origin, { ...options, serverUrl });
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.coreSdk.on(event, (...args: any[]) => {
        // IframeFrontend has corresponding coreSdkDispatch method.
        this.emit('dispatch_msg', {
          fn: 'coreSdkDispatch',
          args: [{ fn: 'emit', args: [event, ...args] }],
        });
      });
    }
  }

  public coreSdkDispatch = createDispatchFn(this, 'coreSdk', debug);
}
