"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const observable_1 = require("threads/observable");
const worker_1 = require("threads/worker");
const _1 = require(".");
let wasm;
const subject = new observable_1.Subject();
const worker = {
    async init(module, initial) {
        wasm = new _1.BarretenbergWasm();
        wasm.on('log', str => subject.next(str));
        await wasm.init(module, initial);
    },
    async transferToHeap(buffer, offset) {
        wasm.transferToHeap(buffer, offset);
    },
    async sliceMemory(start, end) {
        const mem = wasm.sliceMemory(start, end);
        return (0, worker_1.Transfer)(mem, [mem.buffer]);
    },
    async call(name, ...args) {
        return wasm.call(name, ...args);
    },
    async memSize() {
        return wasm.getMemory().length;
    },
    logs() {
        return observable_1.Observable.from(subject);
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
        await wasm.release();
    },
};
(0, worker_1.expose)(worker);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3dhc20vd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbURBQXlEO0FBQ3pELDJDQUFrRDtBQUNsRCx3QkFBcUM7QUFFckMsSUFBSSxJQUFzQixDQUFDO0FBQzNCLE1BQU0sT0FBTyxHQUFHLElBQUksb0JBQU8sRUFBRSxDQUFDO0FBRTlCLE1BQU0sTUFBTSxHQUFHO0lBQ2IsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUEyQixFQUFFLE9BQWdCO1FBQ3RELElBQUksR0FBRyxJQUFJLG1CQUFnQixFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFrQixFQUFFLE1BQWM7UUFDckQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBYSxFQUFFLEdBQVc7UUFDMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekMsT0FBTyxJQUFBLGlCQUFRLEVBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFzQixDQUFDO0lBQzFELENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQVksRUFBRSxHQUFHLElBQVM7UUFDbkMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTztRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUNqQyxDQUFDO0lBRUQsSUFBSTtRQUNGLE9BQU8sdUJBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLE9BQU87UUFDWCxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU87UUFDWCxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDO0NBQ0YsQ0FBQztBQUlGLElBQUEsZUFBTSxFQUFDLE1BQU0sQ0FBQyxDQUFDIn0=