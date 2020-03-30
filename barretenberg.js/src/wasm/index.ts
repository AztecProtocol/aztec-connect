import { readFile } from 'fs';
import isNode from 'detect-node';
import { promisify } from 'util';
import { BarretenbergWorker } from './worker';
import { spawn, Thread, Worker } from 'threads';

export async function fetchCode() {
  if (isNode) {
    return await promisify(readFile)(__dirname + '/barretenberg.wasm');
  } else {
    const res = await fetch('barretenberg.wasm');
    return Buffer.from(res.arrayBuffer());
  }
}

export async function createWorker() {
  return await spawn<BarretenbergWorker>(new Worker('./worker'));
}

export async function destroyWorker(worker: BarretenbergWorker) {
  await Thread.terminate(worker as any);
}

export class BarretenbergWasm {
  private memory!: WebAssembly.Memory;
  private heap!: Uint8Array;
  private instance!: WebAssembly.Instance;

  public async init(code: Uint8Array) {
    this.memory = new WebAssembly.Memory({ initial: 256 });
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
          if (isNode) {
            const TextDecoder = require('util').TextDecoder;
            // tslint:disable-next-line:no-console
            console.log(new TextDecoder().decode(m.slice(addr, i)));
          } else {
            // tslint:disable-next-line:no-console
            console.log(new TextDecoder().decode(m.slice(addr, i)));
          }
        },
        /*
        wasm_pippenger_unsafe: (scalars: number, numPoints: number, result: number) => {
          console.log("wasm_pippenger_unsafe");
          // const scalarBuf = this.getMemory().slice(scalars, numPoints * 32);
          const pointsPerRun = numPoints / 2;
          const scalarBufLen = pointsPerRun * 32;
          const s1 = Buffer.from(this.getMemory().slice(scalars, scalars + scalarBufLen));
          const s2 = Buffer.from(this.getMemory().slice(scalars + scalarBufLen, scalars + numPoints * 32));


          const resultBuf = new Uint8Array(sharedBuf.slice(2));
          const mem = this.exports().bbmalloc(resultBuf.length);
          this.transferToHeap(resultBuf, mem);
          this.exports().g1_sum(mem, 2, result);
          this.exports().bbfree(mem);
        },
        */
        memory: this.memory,
      },
    };

    const mod = await WebAssembly.instantiate(code, importObj);
    this.instance = mod.instance;
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
