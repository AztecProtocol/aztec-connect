import { createDebugLogger } from '@aztec/barretenberg/log';
import { DispatchMsg, TransportClient } from '@aztec/barretenberg/transport';
import { AztecWalletProvider } from '../../aztec_wallet_provider/aztec_wallet_provider.js';
import { createIframe } from '../../iframe/create_iframe.js';
import { IframeTransportConnect } from '../../iframe/iframe_transport_connect.js';
import { IframeAztecWalletOptions } from '../server/iframe_aztec_wallet_backend.js';
import { IframeAztecWalletFrontend } from './iframe_aztec_wallet_frontend.js';

const debug = createDebugLogger('sdk:iframe_aztec_wallet_provider');

export async function createIframeAztecWalletProviderClient(
  serverUrl: string,
  options: IframeAztecWalletOptions,
): Promise<AztecWalletProvider> {
  debug('creating iframe frontend...');
  const iframe = await createIframe(serverUrl, 'aztec-sdk-iframe');

  const connector = new IframeTransportConnect(iframe.window, serverUrl);
  const transportClient = new TransportClient<DispatchMsg>(connector);
  await transportClient.open();

  const iframeFrontend = new IframeAztecWalletFrontend(transportClient, iframe);
  const { aztecWalletProvider } = await iframeFrontend.initComponents(options);

  // TODO(AD)?
  // iframe.on(IframeEvent.DESTROYED, () => coreSdk.emit(SdkEvent.DESTROYED));

  return aztecWalletProvider;
}
