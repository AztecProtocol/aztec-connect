import { createSharedWorker } from '../chocolate_core_sdk';
import { TransportClient } from '../transport';
import { BananaCoreSdkOptions } from './banana_core_sdk_options';
import { SharedWorkerFrontend } from './shared_worker_frontend';
import { SharedWorkerTransportConnect } from './shared_worker_transport_connect';

export async function createBananaCoreSdk(options: BananaCoreSdkOptions) {
  const worker = await createSharedWorker();
  const connector = new SharedWorkerTransportConnect(worker);
  const transportClient = new TransportClient(connector);
  await transportClient.open();

  const sharedWorkerFrontend = new SharedWorkerFrontend(transportClient);
  const { coreSdk } = await sharedWorkerFrontend.initComponents(options);
  return coreSdk;
}
