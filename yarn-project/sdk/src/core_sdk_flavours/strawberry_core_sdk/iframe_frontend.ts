import { createDebugLogger } from '@aztec/barretenberg/log';
import { createDispatchProxyFromFn } from '@aztec/barretenberg/transport';
import { CoreSdkClientStub, CoreSdkSerializedInterface, CoreSdkServerStub } from '../../core_sdk/index.js';
import { createDispatchFn, TransportClient } from '../transport.js';
import { StrawberryCoreSdkOptions } from './strawberry_core_sdk_options.js';

const debug = createDebugLogger('aztec:sdk:iframe_frontend');

// Implements the serialized core sdk interface.
// Creates a CoreSdkSerializedInterface that forwards to an iframe..
export function createIframeCoreSdk(transportClient: TransportClient): CoreSdkSerializedInterface {
  const coreSdk = createDispatchProxyFromFn(CoreSdkServerStub, (fn: string) => (...args: any[]) => {
    debug(`core sdk dispatch request: ${fn}(${args})`);
    return transportClient.request({ fn: 'coreSdkDispatch', args: [{ fn, args }] });
  });
  return coreSdk;
}

export class IframeFrontend {
  private coreSdk!: CoreSdkSerializedInterface;

  constructor(private transportClient: TransportClient) {}

  public async initComponents(options: StrawberryCoreSdkOptions) {
    // Call `initComponents` on the IframeBackend. Constructs and initializes the strawberry core sdk.
    await this.transportClient.request({ fn: 'initComponents', args: [options] });

    // All requests on CoreSdkDispatch will be sent to IframeBackend coreSdkDispatch function.
    this.coreSdk = createIframeCoreSdk(this.transportClient);
    this.transportClient.on('event_msg', ({ fn, args }) => this[fn](...args));

    return { coreSdk: new CoreSdkClientStub(this.coreSdk) };
  }

  public coreSdkDispatch = createDispatchFn(this, 'coreSdk', debug);
}
