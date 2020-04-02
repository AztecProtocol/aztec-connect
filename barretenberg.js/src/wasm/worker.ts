import { Subject, Observable } from 'threads/observable';
import { expose } from 'threads/worker';
import { BarretenbergWasm, fetchCode } from '../wasm';

let wasm: BarretenbergWasm;
const subject = new Subject();

const worker = {
  async init(module?: WebAssembly.Module, prealloc: number = 0) {
    if (!module) {
      module = new WebAssembly.Module(await fetchCode());
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
    return wasm.getMemory().slice(start, end);
  },

  async call(name: string, ...args: any) {
    return wasm.exports()[name](...args);
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
