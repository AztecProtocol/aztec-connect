import { readFile } from 'fs';
import isNode from 'detect-node';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { createDebugLogger } from '../log';
import { randomBytes } from '../crypto';
import { MemoryFifo } from '../fifo';

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
  private mutexQ = new MemoryFifo<boolean>();
  public module!: WebAssembly.Module;

  public static async new(name = 'wasm', initial?: number) {
    const barretenberg = new BarretenbergWasm();
    barretenberg.on('log', createDebugLogger(`bb:${name}`));
    await barretenberg.init(undefined, initial);
    return barretenberg;
  }

  constructor() {
    super();
    this.mutexQ.put(true);
  }

  public async init(module?: WebAssembly.Module, initial = 256) {
    this.emit('log', `intial mem: ${initial}`);
    this.memory = new WebAssembly.Memory({ initial, maximum: 65536 });
    this.heap = new Uint8Array(this.memory.buffer);

    const importObj = {
      /* eslint-disable camelcase */
      wasi_snapshot_preview1: {
        environ_get: () => {},
        environ_sizes_get: () => {},
        fd_close: () => {},
        fd_read: () => {},
        fd_write: () => {},
        fd_seek: () => {},
        fd_fdstat_get: () => {},
        fd_fdstat_set_flags: () => {},
        path_open: () => {},
        path_filestat_get: () => {},
        proc_exit: () => {},
        random_get: (arr, length) => {
          arr = arr >>> 0;
          const heap = new Uint8Array(this.memory.buffer);
          const randomData = randomBytes(length);
          for (let i = arr; i < arr + length; ++i) {
            heap[i] = randomData[i - arr];
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
    try {
      return this.exports()[name](...args) >>> 0;
    } catch (err) {
      const message = `WASM function ${name} aborted, error: ${err}`;
      this.emit('log', message);
      throw new Error(message);
    }
  }

  private getMemory() {
    if (this.heap.length === 0) {
      return new Uint8Array(this.memory.buffer);
    }
    return this.heap;
  }

  public memSize() {
    return this.getMemory().length;
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

  /**
   * When calling the wasm, sometimes a caller will require exclusive access over a series of calls.
   * e.g. When a result is written to address 0, one cannot have another caller writing to the same address via
   * transferToHeap before the result is read via sliceMemory.
   * acquire() gets a single token from a fifo. The caller must call release() to add the token back.
   */
  public async acquire() {
    await this.mutexQ.get();
  }

  public release() {
    if (this.mutexQ.length() !== 0) {
      throw new Error('Release called but not acquired.');
    }
    this.mutexQ.put(true);
  }
}
