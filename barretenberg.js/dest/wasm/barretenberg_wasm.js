"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarretenbergWasm = exports.fetchCode = void 0;
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const detect_node_1 = (0, tslib_1.__importDefault)(require("detect-node"));
const util_1 = require("util");
const events_1 = require("events");
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
const random_1 = require("../crypto/random");
const fifo_1 = require("../fifo");
events_1.EventEmitter.defaultMaxListeners = 30;
async function fetchCode() {
    if (detect_node_1.default) {
        return await (0, util_1.promisify)(fs_1.readFile)(__dirname + '/barretenberg.wasm');
    }
    else {
        const res = await fetch('/barretenberg.wasm');
        return Buffer.from(await res.arrayBuffer());
    }
}
exports.fetchCode = fetchCode;
class BarretenbergWasm extends events_1.EventEmitter {
    constructor() {
        super();
        this.mutexQ = new fifo_1.MemoryFifo();
        this.mutexQ.put(true);
    }
    static async new(name = 'wasm', initial) {
        const barretenberg = new BarretenbergWasm();
        barretenberg.on('log', (0, debug_1.default)(`bb:${name}`));
        await barretenberg.init(undefined, initial);
        return barretenberg;
    }
    async init(module, initial = 256) {
        this.emit('log', `intial mem: ${initial}`);
        this.memory = new WebAssembly.Memory({ initial, maximum: 65536 });
        this.heap = new Uint8Array(this.memory.buffer);
        const importObj = {
            /* eslint-disable camelcase */
            wasi_snapshot_preview1: {
                environ_get: () => { },
                environ_sizes_get: () => { },
                fd_close: () => { },
                fd_read: () => { },
                fd_write: () => { },
                fd_seek: () => { },
                fd_fdstat_get: () => { },
                fd_fdstat_set_flags: () => { },
                path_open: () => { },
                path_filestat_get: () => { },
                proc_exit: () => { },
                random_get: (arr, length) => {
                    arr = arr >>> 0;
                    const heap = new Uint8Array(this.memory.buffer);
                    const randomBytes = (0, random_1.getRandomBytes)(length);
                    for (let i = arr; i < arr + length; ++i) {
                        heap[i] = randomBytes[i - arr];
                    }
                },
            },
            /* eslint-enable camelcase */
            module: {},
            env: {
                logstr: (addr) => {
                    addr = addr >>> 0;
                    const m = this.getMemory();
                    let i = addr;
                    for (; m[i] !== 0; ++i)
                        ;
                    // eslint-disable-next-line
                    const decoder = detect_node_1.default ? new (require('util').TextDecoder)() : new TextDecoder();
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
        }
        else {
            const { instance, module } = await WebAssembly.instantiate(await fetchCode(), importObj);
            this.instance = instance;
            this.module = module;
        }
    }
    exports() {
        return this.instance.exports;
    }
    /**
     * When returning values from the WASM, use >>> operator to convert signed representation to unsigned representation.
     */
    call(name, ...args) {
        if (!this.exports()[name]) {
            throw new Error(`WASM function ${name} not found.`);
        }
        return this.exports()[name](...args) >>> 0;
    }
    getMemory() {
        if (this.heap.length === 0) {
            return new Uint8Array(this.memory.buffer);
        }
        return this.heap;
    }
    sliceMemory(start, end) {
        return this.getMemory().slice(start, end);
    }
    transferToHeap(arr, offset) {
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
    async acquire() {
        await this.mutexQ.get();
    }
    async release() {
        if (this.mutexQ.length() !== 0) {
            throw new Error('Release called but not acquired.');
        }
        this.mutexQ.put(true);
    }
}
exports.BarretenbergWasm = BarretenbergWasm;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFycmV0ZW5iZXJnX3dhc20uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd2FzbS9iYXJyZXRlbmJlcmdfd2FzbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsMkJBQThCO0FBQzlCLDJFQUFpQztBQUNqQywrQkFBaUM7QUFDakMsbUNBQXNDO0FBQ3RDLCtEQUFnQztBQUNoQyw2Q0FBa0Q7QUFDbEQsa0NBQXFDO0FBRXJDLHFCQUFZLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFDO0FBRS9CLEtBQUssVUFBVSxTQUFTO0lBQzdCLElBQUkscUJBQU0sRUFBRTtRQUNWLE9BQU8sTUFBTSxJQUFBLGdCQUFTLEVBQUMsYUFBUSxDQUFDLENBQUMsU0FBUyxHQUFHLG9CQUFvQixDQUFDLENBQUM7S0FDcEU7U0FBTTtRQUNMLE1BQU0sR0FBRyxHQUFHLE1BQU0sS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDOUMsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7S0FDN0M7QUFDSCxDQUFDO0FBUEQsOEJBT0M7QUFFRCxNQUFhLGdCQUFpQixTQUFRLHFCQUFZO0lBY2hEO1FBQ0UsS0FBSyxFQUFFLENBQUM7UUFYRixXQUFNLEdBQUcsSUFBSSxpQkFBVSxFQUFXLENBQUM7UUFZekMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQVZNLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxNQUFNLEVBQUUsT0FBZ0I7UUFDckQsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1FBQzVDLFlBQVksQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUEsZUFBVyxFQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sWUFBWSxDQUFDLElBQUks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