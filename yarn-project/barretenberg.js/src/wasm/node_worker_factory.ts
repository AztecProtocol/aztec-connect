import { Worker } from 'worker_threads';
import { BarretenbergWasm } from './barretenberg_wasm.js';
import { createDispatchProxy, DispatchMsg, TransportClient } from '../transport/index.js';
import { NodeConnector } from '../transport/index.js';
import { BarretenbergWorker } from './barretenberg_worker.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

export async function createNodeWorker() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const worker = new Worker(__dirname + `/node_worker.js`);
  const transportConnect = new NodeConnector(worker);
  const transportClient = new TransportClient<DispatchMsg>(transportConnect);
  await transportClient.open();
  const barretenbergWorker = createDispatchProxy(BarretenbergWasm, transportClient);
  const destroyWorker = async () => {
    await transportClient.request({ fn: '__destroyWorker__', args: [] });
    transportClient.close();
  };
  barretenbergWorker['destroyWorker'] = destroyWorker;
  return barretenbergWorker as BarretenbergWorker;
}
