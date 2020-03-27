import { readFile } from 'fs';
import isNode from 'detect-node';
import { promisify } from 'util';
import { Crs } from '../crs';

export class BarretenbergWasm {
  private memory!: WebAssembly.Memory;
  private heap!: Uint8Array;
  private instance!: WebAssembly.Instance;

  constructor(private crs?: Crs) {}

  public async init() {
    this.memory = new WebAssembly.Memory({ initial: 256 });
    this.heap = new Uint8Array(this.memory.buffer);

    if (this.crs) {
      this.transferToHeap(this.crs.getData(), this.getMonomialsAddress());
    }

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
          for (i=addr; m[i] !== 0; ++i);
          // tslint:disable-next-line:no-console
          if (isNode) {
            const TextDecoder = require('util').TextDecoder;
            console.log(new TextDecoder().decode(m.slice(addr, i)));
          } else {
            console.log(new TextDecoder().decode(m.slice(addr, i)));
          }
        },
        wasm_pippenger_unsafe: (scalars: number, numPoints: number, result: number) => {
          this.exports().pippenger_unsafe(
            scalars, this.getMonomialsAddress(), numPoints, result
          );
        },
        memory: this.memory },
    };

    if (isNode) {
      const res = await promisify(readFile)(__dirname + '/barretenberg.wasm');
      const mod = await WebAssembly.instantiate(res, importObj);
      this.instance = mod.instance;
    } else {
      const res = await fetch('barretenberg.wasm');
      const mod = await WebAssembly.instantiateStreaming(res, importObj);
      this.instance = mod.instance;
    }
  }

  public getMonomialsAddress(): number {
    return 1024;
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
