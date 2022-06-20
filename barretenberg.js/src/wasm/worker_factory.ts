import { BarretenbergWorker } from './worker';
import { spawn, Thread, Worker } from 'threads';
import { createDebugLogger } from '../log';

export async function createWorker(id?: string, module?: WebAssembly.Module, initial?: number) {
  const debug = createDebugLogger(`bb:wasm${id ? ':' + id : ''}`);
  const thread = await spawn<BarretenbergWorker>(new Worker('./worker.js'));
  thread.logs().subscribe(debug);
  await thread.init(module, initial);
  return thread;
}

export async function destroyWorker(worker: BarretenbergWorker) {
  await Thread.terminate(worker as any);
}
