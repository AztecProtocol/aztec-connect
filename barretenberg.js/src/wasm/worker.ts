import { expose } from "threads/worker"
import { BarretenbergWasm } from '../wasm';

let wasm: BarretenbergWasm;

const worker = {
  async init(code: Uint8Array) {
    wasm = new BarretenbergWasm();
    await wasm.init(code);
  },

  async transferToHeap(buffer: Uint8Array, offset: number) {
    wasm.transferToHeap(buffer, offset);
  },

  async sliceMemory(start:number, end: number) {
    return wasm.getMemory().slice(start, end);
  },

  async call(name: string, ...args: any) {
    return wasm.exports()[name](...args);
  },
};

export type BarretenbergWorker = typeof worker;

expose(worker);