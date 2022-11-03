import { createSharedWorker } from '../chocolate_core_sdk/index.js';
import { TransportClient } from '../transport.js';
import { BananaCoreSdkOptions } from './banana_core_sdk_options.js';
import { SharedWorkerFrontend } from './shared_worker_frontend.js';
import { SharedWorkerTransportConnect } from './shared_worker_transport_connect.js';
import { createDebugLogger } from '@aztec/barretenberg/log';

const debug = createDebugLogger('bb:create_banana_core_sdk');

export async function createBananaCoreSdk(options: BananaCoreSdkOptions) {
  debug('creating shared worker frontend...');
  const worker = createSharedWorker();
  const connector = new SharedWorkerTransportConnect(worker);
  const transportClient = new TransportClient(connector);
  await transportClient.open();

  const sharedWorkerFrontend = new SharedWorkerFrontend(transportClient);
  const { coreSdk } = await sharedWorkerFrontend.initComponents(options);
  return coreSdk;
}
