import fetch from 'isomorphic-fetch';
import { readFileAsync } from './fs-async';
import isNode from 'detect-node';

export class BarretenbergWasm {
  private memory!: WebAssembly.Memory;
  private heap!: Uint8Array;
  private instance!: WebAssembly.Instance;

  public async init() {
    this.memory = new WebAssembly.Memory({ initial: 2 });
    this.heap = new Uint8Array(this.memory.buffer);

    const importObj = {
      wasi_unstable: {
        fd_close: () => {},
        fd_read: () => {},
        fd_write: () => {},
        fd_seek: () => {},
        fd_fdstat_get: () => {},
        random_get: (arr, length) => {
          const heap = new Uint8Array(this.memory.buffer);
          for (let i = arr; i < arr + length; ++i) {
            heap[i] = Math.floor(Math.random() * 256);
          }
        },
      },
      module: {},
      env: { memory: this.memory },
    };

    if (isNode) {
      const res = await readFileAsync('./src/wasm/barretenberg.wasm')
      const mod = await WebAssembly.instantiate(res, importObj);
      this.instance = mod.instance;
    } else {
      const res = await fetch('file://barretenberg.wasm');
      const mod = await WebAssembly.instantiateStreaming(res, importObj);
      this.instance = mod.instance;
    }
  }

  public exports(): any {
    return this.instance.exports;
  }

  public getMemory() {
    if (this.heap.length === 0) {
      return new Uint8Array(this.memory.buffer);
    }
    return this.heap;
  }

  public transferToHeap(arr: Uint8Array, offset: number) {
    const mem = this.getMemory();
    for (let i = 0; i < arr.length; i++) {
      mem[i + offset] = arr[i];
    }
  }
}
