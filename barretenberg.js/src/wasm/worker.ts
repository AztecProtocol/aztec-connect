/* eslint-disable require-await */
import { Subject, Observable } from 'threads/observable';
import { expose, Transfer } from 'threads/worker';
import { BarretenbergWasm } from '.';

let wasm: BarretenbergWasm;
const subject = new Subject();

const worker = {
  async init(module?: WebAssembly.Module, initial?: number) {
    wasm = new BarretenbergWasm();
    wasm.on('log', str => subject.next(str));
    await wasm.init(module, initial);
  },

  async transferToHeap(buffer: Uint8Array, offset: number) {
    wasm.transferToHeap(buffer, offset);
  },

  async sliceMemory(start: number, end: number) {
    const mem = wasm.sliceMemory(start, end);
    return Transfer(mem, [mem.buffer]) as any as Uint8Array;
  },

  async call(name: string, ...args: any) {
    return wasm.call(name, ...args);
  },

  async memSize() {
    return wasm.memSize();
  },

  logs() {
    return Observable.from(subject);
  },

  /**
   * When calling the wasm, sometimes a caller will require exclusive access over a series of calls.
   * e.g. When a result is written to address 0, one cannot have another caller writing to the same address via
   * transferToHeap before the result is read via sliceMemory.
   * acquire() gets a single token from a fifo. The caller must call release() to add the token back.
   */
  async acquire() {
    await wasm.acquire();
  },

  async release() {
    wasm.release();
  },
};

export type BarretenbergWorker = typeof worker;

expose(worker);
