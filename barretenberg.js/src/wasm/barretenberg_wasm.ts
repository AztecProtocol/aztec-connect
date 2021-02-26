import { readFile } from 'fs';
import isNode from 'detect-node';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import createDebug from 'debug';
import { getRandomBytes } from '../crypto/random';

EventEmitter.defaultMaxListeners = 30;

export async function fetchCode() {
  if (isNode) {
    return await promisify(readFile)(__dirname + '/barretenberg.wasm');
  } else {
    const res = await fetch('/barretenberg.wasm');
    return Buffer.from(await res.arrayBuffer());
  }
}

export class BarretenbergWasm extends EventEmitter {
  private memory!: WebAssembly.Memory;
  private heap!: Uint8Array;
  private instance!: WebAssembly.Instance;
  public module!: WebAssembly.Module;

  public static async new(name = 'wasm') {
    const barretenberg = new BarretenbergWasm();
    barretenberg.on('log', createDebug(`bb:${name}`));
    await barretenberg.init();
    return barretenberg;
  }

  public async init(module?: WebAssembly.Module) {
    this.memory = new WebAssembly.Memory({ initial: 256, maximum: 65536 });
    this.heap = new Uint8Array(this.memory.buffer);

    const importObj = {
      /* eslint-disable camelcase */
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
          arr = arr >>> 0;
          const heap = new Uint8Array(this.memory.buffer);
          const randomBytes = getRandomBytes(length);
          for (let i = arr; i < arr + length; ++i) {
            heap[i] = randomBytes[i - arr];
          }
        },
      },
      /* eslint-enable camelcase */
      module: {},
      env: {
        logstr: (addr: number) => {
          addr = addr >>> 0;
          const m = this.getMemory();
          let i = addr;
          for (; m[i] !== 0; ++i);
          // eslint-disable-next-line
          const decoder = isNode ? new (require('util').TextDecoder)() : new TextDecoder();
          const str = decoder.decode(m.slice(addr, i));
          const str2 = `${str} (mem:${m.length})`;
          this.emit('log', str2);
        },
        memory: this.memory,
      },
    };

    if (module) {
      this.instance = await WebAssembly.instantiate(module, importObj);
      this.module = module;
    } else {
      const { instance, module } = await WebAssembly.instantiate(await fetchCode(), importObj);
      this.instance = instance;
      this.module = module;
    }
  }

  public exports(): any {
    return this.instance.exports;
  }

  /**
   * When returning values from the WASM, use >>> operator to convert signed representation to unsigned representation.
   */
  public call(name: string, ...args: any) {
    if (!this.exports()[name]) {
      throw new Error(`WASM function ${name} not found.`);
    }
    return this.exports()[name](...args) >>> 0;
  }

  public getMemory() {
    if (this.heap.length === 0) {
      return new Uint8Array(this.memory.buffer);
    }
    return this.heap;
  }

  public sliceMemory(start: number, end: number) {
    return this.getMemory().slice(start, end);
  }

  public transferToHeap(arr: Uint8Array, offset: number) {
    const mem = this.getMemory();
    for (let i = 0; i < arr.length; i++) {
      mem[i + offset] = arr[i];
    }
  }
}
