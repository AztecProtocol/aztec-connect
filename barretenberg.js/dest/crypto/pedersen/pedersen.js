"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pedersen = void 0;
const serialize_1 = require("../../serialize");
/**
 * Single threaded implementation of pedersen.
 */
class Pedersen {
    /**
     * Long running functions can execute on a worker. If none is provided, call the wasm on the calling thread.
     *
     * @param wasm Synchronous functions will use use this wasm directly on the calling thread.
     * @param worker Asynchronous functions execute on this worker, preventing blocking the calling thread.
     */
    constructor(wasm, worker = wasm) {
        this.wasm = wasm;
        this.worker = worker;
    }
    async init() {
        this.wasm.call('pedersen__init');
        await this.worker.call('pedersen__init');
    }
    compress(lhs, rhs) {
        this.wasm.transferToHeap(lhs, 0);
        this.wasm.transferToHeap(rhs, 32);
        this.wasm.call('pedersen__compress_fields', 0, 32, 64);
        return Buffer.from(this.wasm.sliceMemory(64, 96));
    }
    compressInputs(inputs) {
        const inputVectors = (0, serialize_1.serializeBufferArrayToVector)(inputs);
        this.wasm.transferToHeap(inputVectors, 0);
        this.wasm.call('pedersen__compress', 0, 0);
        return Buffer.from(this.wasm.sliceMemory(0, 32));
    }
    compressWithHashIndex(inputs, hashIndex) {
        const inputVectors = (0, serialize_1.serializeBufferArrayToVector)(inputs);
        this.wasm.transferToHeap(inputVectors, 0);
        this.wasm.call('pedersen__compress_with_hash_index', 0, 0, hashIndex);
        return Buffer.from(this.wasm.sliceMemory(0, 32));
    }
    hashToField(data) {
        const mem = this.wasm.call('bbmalloc', data.length);
        this.wasm.transferToHeap(data, mem);
        this.wasm.call('pedersen__buffer_to_field', mem, data.length, 0);
        this.wasm.call('bbfree', mem);
        return Buffer.from(this.wasm.sliceMemory(0, 32));
    }
    async hashToTree(values) {
        const data = (0, serialize_1.serializeBufferArrayToVector)(values);
        const inputPtr = await this.worker.call('bbmalloc', data.length);
        await this.worker.transferToHeap(data, inputPtr);
        const resultPtr = await this.worker.call('pedersen__hash_to_tree', inputPtr);
        const resultNumFields = Buffer.from(await this.worker.sliceMemory(resultPtr, resultPtr + 4)).readUInt32BE(0);
        const resultData = Buffer.from(await this.worker.sliceMemory(resultPtr, resultPtr + 4 + resultNumFields * 32));
        await this.worker.call('bbfree', inputPtr);
        await this.worker.call('bbfree', resultPtr);
        return (0, serialize_1.deserializeArrayFromVector)(serialize_1.deserializeField, resultData).elem;
    }
}
exports.Pedersen = Pedersen;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVkZXJzZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY3J5cHRvL3BlZGVyc2VuL3BlZGVyc2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUE2RztBQUk3Rzs7R0FFRztBQUNILE1BQWEsUUFBUTtJQUNuQjs7Ozs7T0FLRztJQUNILFlBQW9CLElBQXNCLEVBQVUsU0FBNkIsSUFBVztRQUF4RSxTQUFJLEdBQUosSUFBSSxDQUFrQjtRQUFVLFdBQU0sR0FBTixNQUFNLENBQWtDO0lBQUcsQ0FBQztJQUV6RixLQUFLLENBQUMsSUFBSTtRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDakMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFTSxRQUFRLENBQUMsR0FBZSxFQUFFLEdBQWU7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRU0sY0FBYyxDQUFDLE1BQWdCO1FBQ3BDLE1BQU0sWUFBWSxHQUFHLElBQUEsd0NBQTRCLEVBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFD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