import { CoreSdkClientStub, CoreSdkDispatch, SdkEvent } from '../../core_sdk';
import { CoreSdkSerializedInterface } from '../../core_sdk/core_sdk_serialized_interface';
import { DispatchMsg, TransportClient } from '../transport';
import { StrawberryCoreSdkOptions } from './strawberry_core_sdk_options';

export class IframeFrontend {
  private coreSdk!: CoreSdkSerializedInterface;

  constructor(private transportClient: TransportClient) {}

  public async initComponents(options: StrawberryCoreSdkOptions) {
    // Call `initComponents` on the IframeBackend. Constructs and initializes the strawberry core sdk.
    await this.transportClient.request({ fn: 'initComponents', args: [options] });

    // All requests on CoreSdkDispatch will be sent to IframeBackend coreSdkDispatch function.
    this.coreSdk = new CoreSdkDispatch(msg => this.transportClient.request({ fn: 'coreSdkDispatch', args: [msg] }));

    this.coreSdk.on(SdkEvent.DESTROYED, () => this.transportClient.close());

    this.transportClient.on('event_msg', ({ fn, args }) => this[fn](...args));

    return { coreSdk: new CoreSdkClientStub(this.coreSdk) };
  }

  public async coreSdkDispatch({ fn, args }: DispatchMsg) {
    return await this.coreSdk[fn](...args);
  }
}
