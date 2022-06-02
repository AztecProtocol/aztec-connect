import { createSharedWorker } from '../chocolate_core_sdk';
import { TransportClient } from '../transport';
import { BananaCoreSdkOptions } from './banana_core_sdk_options';
import { SharedWorkerFrontend } from './shared_worker_frontend';
import { SharedWorkerTransportConnect } from './shared_worker_transport_connect';
import { createLogger } from '@aztec/barretenberg/debug';

const debug = createLogger('bb:create_banana_core_sdk');

export async function createBananaCoreSdk(options: BananaCoreSdkOptions) {
  debug('creating shared worker frontend...');
  const worker = await createSharedWorker();
  const connector = new SharedWorkerTransportConnect(worker);
  const transportClient = new TransportClient(connector);
  await transportClient.open();

  const sharedWorkerFrontend = new SharedWorkerFrontend(transportClient);
  const { coreSdk } = await sharedWorkerFrontend.initComponents(options);
  return coreSdk;
}
