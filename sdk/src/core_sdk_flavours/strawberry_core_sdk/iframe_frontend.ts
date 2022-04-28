import { CoreSdkClientStub, CoreSdkDispatch } from '../../core_sdk';
import { CoreSdkSerializedInterface } from '../../core_sdk/core_sdk_serialized_interface';
import { createDispatchFn, TransportClient } from '../transport';
import { StrawberryCoreSdkOptions } from './strawberry_core_sdk_options';
import { createLogger } from '@aztec/barretenberg/debug';

const debug = createLogger('aztec:sdk:iframe_frontend');

export class IframeFrontend {
  private coreSdk!: CoreSdkSerializedInterface;

  constructor(private transportClient: TransportClient) {}

  public async initComponents(options: StrawberryCoreSdkOptions) {
    // Call `initComponents` on the IframeBackend. Constructs and initializes the strawberry core sdk.
    await this.transportClient.request({ fn: 'initComponents', args: [options] });

    // All requests on CoreSdkDispatch will be sent to IframeBackend coreSdkDispatch function.
    this.coreSdk = new CoreSdkDispatch(msg => {
      debug(`dispatch request: ${msg.fn}(${msg.args})`);
      return this.transportClient.request({ fn: 'coreSdkDispatch', args: [msg] });
    });

    this.transportClient.on('event_msg', ({ fn, args }) => this[fn](...args));

    return { coreSdk: new CoreSdkClientStub(this.coreSdk) };
  }

  public coreSdkDispatch = createDispatchFn(this, 'coreSdk', debug);
}
