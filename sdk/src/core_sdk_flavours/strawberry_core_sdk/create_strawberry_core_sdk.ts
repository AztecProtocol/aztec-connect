import { TransportClient } from '../transport';
import { createIframe } from './create_iframe';
import { IframeFrontend } from './iframe_frontend';
import { IframeTransportConnect } from './iframe_transport';
import { StrawberryCoreSdkOptions } from './strawberry_core_sdk_options';

export async function createStrawberryCoreSdk(options: StrawberryCoreSdkOptions) {
  const iframe = await createIframe(options.serverUrl);

  const connector = new IframeTransportConnect(iframe.window, options.serverUrl);
  const transportClient = new TransportClient(connector);
  await transportClient.open();

  const iframeFrontend = new IframeFrontend(transportClient);
  const { coreSdk } = await iframeFrontend.initComponents(options);

  return coreSdk;
}
