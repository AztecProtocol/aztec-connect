import { parentPort } from 'worker_threads';
import { NodeListener, DispatchMsg, TransportServer } from '../../transport/index.js';
import { BarretenbergWasm } from '../barretenberg_wasm.js';

if (!parentPort) {
  throw new Error('InvalidWorker');
}

async function dispatch({ fn, args }: DispatchMsg) {
  if (fn === '__destroyWorker__') {
    transportServer.stop();
    return;
  }
  if (!barretenbergWasm[fn]) {
    throw new Error(`dispatch error, function not found: ${fn}`);
  }
  return await barretenbergWasm[fn](...args);
}

const barretenbergWasm = new BarretenbergWasm();
const transportListener = new NodeListener();
const transportServer = new TransportServer<DispatchMsg>(transportListener, dispatch);
barretenbergWasm.on('log', (...args: any[]) => transportServer.broadcast({ fn: 'emit', args: ['log', ...args] }));
transportServer.start();
