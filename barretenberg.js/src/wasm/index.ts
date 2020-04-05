import { readFile } from 'fs';
import isNode from 'detect-node';
import { promisify } from 'util';
import { EventEmitter } from 'events';

export async function fetchCode() {
  if (isNode) {
    return await promisify(readFile)(__dirname + '/barretenberg.wasm');
  } else {
    const res = await fetch('barretenberg.wasm');
    return Buffer.from(await res.arrayBuffer());
  }
}

export class BarretenbergWasm extends EventEmitter {
  private memory!: WebAssembly.Memory;
  private heap!: Uint8Array;
  private instance!: WebAssembly.Instance;

  public async init(module: WebAssembly.Module, prealloc: number = 0) {
    this.memory = new WebAssembly.Memory({ initial: 256, maximum: 8192 });
    this.heap = new Uint8Array(this.memory.buffer);

    const importObj = {
      wasi_unstable: {
        fd_close: () => {},
        fd_read: () => {},
        fd_write: () => {},
        fd_seek: () => {},
        fd_fdstat_get: () => {},
        fd_fdstat_set_flags: () => {},
        path_open: () => {},
        path_filestat_get: () => {},
        random_get: (arr, length) => {
          const heap = new Uint8Array(this.memory.buffer);
          for (let i = arr; i < arr + length; ++i) {
            heap[i] = Math.floor(Math.random() * 256);
          }
        },
      },
      module: {},
      env: {
        logstr: (addr: number) => {
          const m = this.getMemory();
          let i;
          for (i = addr; m[i] !== 0; ++i);
          const decoder = isNode ? new (require('util').TextDecoder)() : new TextDecoder();
          const str = decoder.decode(m.slice(addr, i));
          const str2 = `${str} (mem:${m.length})`;
          this.emit('log', str2);
        },
        memory: this.memory,
      },
    };

    this.instance = await WebAssembly.instantiate(module, importObj);

    if (prealloc) {
      const pa = this.exports().bbmalloc(prealloc);
      this.exports().bbfree(pa);
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
