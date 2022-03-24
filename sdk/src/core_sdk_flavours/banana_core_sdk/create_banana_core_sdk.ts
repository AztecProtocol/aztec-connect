import { TransportClient } from '../transport';
import { createServiceWorker } from '../chocolate_core_sdk';
import { BananaCoreSdkOptions } from './banana_core_sdk_options';
import { ServiceWorkerFrontend } from './service_worker_frontend';
import { ServiceWorkerTransportConnect } from './service_worker_transport_connect';

export async function createBananaCoreSdk(options: BananaCoreSdkOptions) {
  const sw = await createServiceWorker();
  const connector = new ServiceWorkerTransportConnect(sw);
  const transportClient = new TransportClient(connector);
  await transportClient.open();

  const serviceWorkerFrontend = new ServiceWorkerFrontend(transportClient);
  const { coreSdk } = await serviceWorkerFrontend.initComponents(options);

  sw.addEventListener('statechange', async () => {
    await coreSdk.destroy();
  });

  return coreSdk;
}
