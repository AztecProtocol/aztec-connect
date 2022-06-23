import { SdkEvent } from '../../core_sdk';
import { TransportClient } from '../transport';
import { createIframe, IframeEvent } from './create_iframe';
import { IframeFrontend } from './iframe_frontend';
import { IframeTransportConnect } from './iframe_transport_connect';
import { StrawberryCoreSdkOptions } from './strawberry_core_sdk_options';
import { createDebugLogger } from '@aztec/barretenberg/log';

const debug = createDebugLogger('bb:create_strawberry_core_sdk');

export async function createStrawberryCoreSdk(options: StrawberryCoreSdkOptions) {
  debug('creating iframe frontend...');
  const iframe = await createIframe(options.serverUrl);

  const connector = new IframeTransportConnect(iframe.window, options.serverUrl);
  const transportClient = new TransportClient(connector);
  await transportClient.open();

  const iframeFrontend = new IframeFrontend(transportClient);
  const { coreSdk } = await iframeFrontend.initComponents(options);

  iframe.on(IframeEvent.DESTROYED, () => coreSdk.emit(SdkEvent.DESTROYED));

  return coreSdk;
}
