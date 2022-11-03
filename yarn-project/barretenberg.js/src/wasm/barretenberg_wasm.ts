import { readFile } from 'fs/promises';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import { createDebugLogger } from '../log/index.js';
import { randomBytes } from '../crypto/index.js';
import { MemoryFifo } from '../fifo/index.js';
import { fetch } from 'cross-fetch';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

EventEmitter.defaultMaxListeners = 30;

export async function fetchCode() {
  if (isNode) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    return await readFile(__dirname + '/barretenberg.wasm');
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

  public static async new(name?: string, initial?: number) {
    const barretenberg = new BarretenbergWasm();
    barretenberg.on('log', createDebugLogger(name ? `bb:wasm:${name}` : 'bb:wasm'));
    await barretenberg.init(undefined, initial);
    return barretenberg;
  }

  constructor() {
    super();
    this.mutexQ.put(true);
  }

  /**
   * 20 pages by default. 20*2**16 > 1mb stack size plus other overheads.
   * 8192 maximum by default. 512mb.
   */
  public async init(module?: WebAssembly.Module, initial = 20, maximum = 8192) {
    this.emit(
      'log',
      `initial mem: ${initial} pages, ${(initial * 2 ** 16) / (1024 * 1024)}mb. max mem: ${maximum} pages, ${
        (maximum * 2 ** 16) / (1024 * 1024)
      }mb`,
    );
    this.memory = new WebAssembly.Memory({ initial, maximum });
    // Create a view over the memory buffer.
    // We do this once here, as webkit *seems* bugged out and actually shows this as new memory,
    // thus displaying double. It's only worse if we create views on demand. I haven't established yet if
    // the bug is also exasperating the termination on mobile due to "excessive memory usage". It could be
    // that the OS is actually getting an incorrect reading in the same way the memory profiler does...
    // The view will have to be recreated if the memory is grown. See getMemory().
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
        fd_prestat_get: () => {
          return 8;
        },
        fd_prestat_dir_name: () => {},
        path_open: () => {},
        path_filestat_get: () => {},
        proc_exit: () => {},
        random_get: (arr, length) => {
          arr = arr >>> 0;
          const heap = this.getMemory();
          const randomData = randomBytes(length);
          for (let i = arr; i < arr + length; ++i) {
            heap[i] = randomData[i - arr];
          }
        },
      },
      env: {
        logstr: (addr: number) => {
          addr = addr >>> 0;
          const m = this.getMemory();
          let i = addr;
          for (; m[i] !== 0; ++i);
          const str = Buffer.from(m.slice(addr, i)).toString('ascii');
          const str2 = `${str} (mem: ${(m.length / (1024 * 1024)).toFixed(2)}MB)`;
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
    // If the memory is grown, our view over it will be lost. Recreate the view.
    if (this.heap.length === 0) {
      this.heap = new Uint8Array(this.memory.buffer);
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
