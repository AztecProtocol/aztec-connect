import { Subject, Observable } from 'threads/observable';
import { expose, Transfer } from 'threads/worker';
import { BarretenbergWasm, createModule } from '../wasm';

let wasm: BarretenbergWasm;
const subject = new Subject();

const worker = {
  async init(module?: WebAssembly.Module, prealloc: number = 0) {
    if (!module) {
      module = await createModule();
    }
    wasm = new BarretenbergWasm();
    await wasm.init(module, prealloc);
    wasm.on('log', str => subject.next(str));
    return module;
  },

  async transferToHeap(buffer: Uint8Array, offset: number) {
    wasm.transferToHeap(buffer, offset);
  },

  async sliceMemory(start: number, end: number) {
    const mem = wasm.sliceMemory(start, end);
    return Transfer(mem, [mem.buffer]) as any as Uint8Array;
  },

  async call(name: string, ...args: any) {
    return wasm.call(name, args);
  },

  async memSize() {
    return wasm.getMemory().length;
  },

  logs() {
    return Observable.from(subject)
  },
};

export type BarretenbergWorker = typeof worker;

expose(worker);
