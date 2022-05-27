import { createIframe } from './create_iframe';
import { TransportClient } from '../transport';
import { IframeFrontend } from './iframe_frontend';
import { IframeTransportConnect } from './iframe_transport_connect';
import { StrawberryCoreSdkOptions } from './strawberry_core_sdk_options';
import { createLogger } from '@aztec/barretenberg/debug';

const debug = createLogger('bb:create_strawberry_core_sdk');

export async function createStrawberryCoreSdk(options: StrawberryCoreSdkOptions) {
  debug('creating iframe frontend...');
  const iframe = await createIframe(options.serverUrl);

  const connector = new IframeTransportConnect(iframe.window, options.serverUrl);
  const transportClient = new TransportClient(connector);
  await transportClient.open();

  const iframeFrontend = new IframeFrontend(transportClient);
  const { coreSdk } = await iframeFrontend.initComponents(options);

  return coreSdk;
}
