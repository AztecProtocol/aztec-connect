import { readFile } from 'fs/promises';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import { createDebugLogger } from '../log/index.js';
import { randomBytes } from '../crypto/index.js';
import { MemoryFifo } from '../fifo/index.js';
import { fetch } from 'cross-fetch';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { NodeDataStore } from './node/index.js';
import { WebDataStore } from './browser/index.js';
import { numToUInt32LE } from '../serialize/free_funcs.js';
import { AsyncCallState, AsyncFnState } from './async_call_state.js';

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
  private store = isNode ? new NodeDataStore() : new WebDataStore();
  private memory!: WebAssembly.Memory;
  private heap!: Uint8Array;
  private instance!: WebAssembly.Instance;
  private mutexQ = new MemoryFifo<boolean>();
  private asyncCallState = new AsyncCallState();
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
    this.debug(
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
      // We need to implement a part of the wasi api:
      // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md
      // We literally only need to support random_get, everything else we can sidestep.
      // I've tried upgrading to a newer version wasi, but wasn't able to get this highly minimalist approach
      // to work. There are other wasi implementations out there (node ships with one, but that's not much
      // use for web). There is a web friendly one but I ran into some troubles, plus they're a bit bloated.
      // So, for now we remain "stuck" on wasi 12...

      /* eslint-disable camelcase */
      wasi_snapshot_preview1: {
        environ_get: () => {
          this.debug('environ_get');
        },
        environ_sizes_get: () => {
          this.debug('environ_sizes_get');
        },
        fd_close: () => {
          this.debug('fd_close');
        },
        fd_read: () => {
          this.debug('fd_read');
        },
        fd_write: () => {
          this.debug('fd_write');
        },
        fd_seek: () => {
          this.debug('fd_seek');
        },
        fd_fdstat_get: () => {
          this.debug('fd_fdstat_get');
        },
        fd_fdstat_set_flags: () => {
          this.debug('fd_fdstat_set_flags');
        },
        fd_prestat_get: () => {
          this.debug('fd_prestat_get');
          return 8;
        },
        fd_prestat_dir_name: () => {
          this.debug('fd_prestat_dir_name');
          return 28;
        },
        path_open: () => {
          this.debug('path_open');
        },
        path_filestat_get: () => {
          this.debug('path_filestat_get');
        },
        proc_exit: () => {
          this.debug('proc_exit');
          return 52;
        },
        random_get: (arr, length) => {
          arr = arr >>> 0;
          const heap = this.getMemory();
          const randomData = randomBytes(length);
          for (let i = arr; i < arr + length; ++i) {
            heap[i] = randomData[i - arr];
          }
        },
      },

      // These are functions implementations for imports we've defined are needed.
      // The native C++ build defines these in a module called "env". We must implement TypeScript versions here.
      env: {
        /**
         * The 'info' call we use for logging in C++, calls this under the hood.
         * The native code will just print to std:err (to avoid std::cout which is used for IPC).
         * Here we just emit the log line for the client to decide what to do with.
         */
        logstr: (addr: number) => {
          const str = this.stringFromAddress(addr);
          const m = this.getMemory();
          const str2 = `${str} (mem: ${(m.length / (1024 * 1024)).toFixed(2)}MB)`;
          this.debug(str2);
        },
        /**
         * Read the data associated with the key located at keyAddr.
         * Malloc data within the WASM, copy the data into the WASM, and return the address to the caller.
         * The caller is responsible for taking ownership of (and freeing) the memory at the returned address.
         */
        get_data: this.asyncCallState.wrapImportFn((state: AsyncFnState, keyAddr: number, lengthOutAddr: number) => {
          const key = this.stringFromAddress(keyAddr);
          if (!state.continuation) {
            // We are in the initial code path. Start the async fetch of data, return the promise.
            this.debug(`get_data: key: ${key}`);
            return this.store.get(key);
          } else {
            const data = state.result as Buffer | undefined;
            if (!data) {
              this.transferToHeap(numToUInt32LE(0), lengthOutAddr);
              this.debug(`get_data: no data found for ${key}`);
              return 0;
            }
            const dataAddr = this.call('bbmalloc', data.length);
            this.transferToHeap(numToUInt32LE(data.length), lengthOutAddr);
            this.transferToHeap(data, dataAddr);
            this.debug(`get_data: data at ${dataAddr} is ${data.length} bytes.`);
            return dataAddr;
          }
        }),
        set_data: this.asyncCallState.wrapImportFn(
          (state: AsyncFnState, keyAddr: number, dataAddr: number, dataLength: number) => {
            if (!state.continuation) {
              const key = this.stringFromAddress(keyAddr);
              this.debug(`set_data: key: ${key} addr: ${dataAddr} length: ${dataLength}`);
              return this.store.set(key, Buffer.from(this.sliceMemory(dataAddr, dataAddr + dataLength)));
            }
          },
        ),
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

    this.asyncCallState.init(this.memory, this.call.bind(this), this.debug.bind(this));
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
    } catch (err: any) {
      const message = `WASM function ${name} aborted, error: ${err}`;
      this.debug(message);
      this.debug(err.stack);
      throw new Error(message);
    }
  }

  /**
   * Uses asyncify to enable async callbacks into js.
   * https://kripken.github.io/blog/wasm/2019/07/16/asyncify.html
   */
  public async asyncCall(name: string, ...args: any) {
    if (this.asyncCallState.state) {
      throw new Error(`Can only handle one async call at a time: ${name}(${args})`);
    }
    return await this.asyncCallState.call(name, ...args);
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

  private stringFromAddress(addr: number) {
    addr = addr >>> 0;
    const m = this.getMemory();
    let i = addr;
    for (; m[i] !== 0; ++i);
    return Buffer.from(m.slice(addr, i)).toString('ascii');
  }

  private debug(str: string) {
    this.emit('log', str);
  }
}
