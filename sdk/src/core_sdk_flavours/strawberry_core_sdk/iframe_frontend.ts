import { CoreSdkClientStub, CoreSdkDispatch, SdkEvent } from '../../core_sdk';
import { TransportClient } from '../transport';
import { StrawberryCoreSdkOptions } from './strawberry_core_sdk_options';

export class IframeFrontend {
  constructor(private transportClient: TransportClient) {}

  public async initComponents(options: StrawberryCoreSdkOptions) {
    // Call `initComponents` on the IframeBackend. Constructs and initializes the strawberry core sdk.
    await this.transportClient.request({ fn: 'initComponents', args: [options] });

    // All requests on CoreSdkDispatch will be sent to IframeBackend coreSdkDispatch function.
    const coreSdk = new CoreSdkDispatch(msg => this.transportClient.request({ fn: 'coreSdkDispatch', args: [msg] }));

    coreSdk.on(SdkEvent.DESTROYED, () => this.transportClient.close());

    return { coreSdk: new CoreSdkClientStub(coreSdk) };
  }
}
