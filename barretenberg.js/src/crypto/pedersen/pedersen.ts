import { serializeBufferArrayToVector } from '../../serialize';
import { BarretenbergWasm } from '../../wasm';
import { BarretenbergWorker } from '../../wasm/worker';

/**
 * Single threaded implementation of pedersen.
 */
export class Pedersen {
  /**
   * Long running functions can execute on a worker. If none is provided, call the wasm on the calling thread.
   *
   * @param wasm Synchronous functions will use use this wasm directly on the calling thread.
   * @param worker Asynchronous functions execute on this worker, preventing blocking the calling thread.
   */
  constructor(private wasm: BarretenbergWasm, private worker: BarretenbergWorker = wasm as any) {}

  public async init() {
    this.wasm.call('pedersen__init');
    await this.worker.call('pedersen__init');
  }

  public compress(lhs: Uint8Array, rhs: Uint8Array) {
    this.wasm.transferToHeap(lhs, 0);
    this.wasm.transferToHeap(rhs, 32);
    this.wasm.call('pedersen__compress_fields', 0, 32, 64);
    return Buffer.from(this.wasm.sliceMemory(64, 96));
  }

  public compressInputs(inputs: Buffer[]) {
    const inputVectors = serializeBufferArrayToVector(inputs);
    this.wasm.transferToHeap(inputVectors, 0);
    this.wasm.call('pedersen__compress', 0, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public compressWithHashIndex(inputs: Buffer[], hashIndex: number) {
    const inputVectors = serializeBufferArrayToVector(inputs);
    this.wasm.transferToHeap(inputVectors, 0);
    this.wasm.call('pedersen__compress_with_hash_index', 0, 0, hashIndex);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public hashToField(data: Buffer) {
    const mem = this.wasm.call('bbmalloc', data.length);
    this.wasm.transferToHeap(data, mem);
    this.wasm.call('pedersen__buffer_to_field', mem, data.length, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public async hashValuesToTree(values: Buffer[]) {
    await this.worker.acquire();
    try {
      const data = Buffer.concat(values);
      const inputPtr = await this.worker.call('bbmalloc', data.length);
      await this.worker.transferToHeap(data, inputPtr);
      const resultSize = await this.worker.call('pedersen__hash_values_to_tree', inputPtr, data.length, 0);
      const resultPtr = Buffer.from(await this.worker.sliceMemory(0, 4)).readUInt32LE(0);
      const result = Buffer.from(await this.worker.sliceMemory(resultPtr, resultPtr + resultSize));
      await this.worker.call('bbfree', inputPtr);
      await this.worker.call('bbfree', resultPtr);
      const results: Buffer[] = [];
      for (let i = 0; i < result.length; i += 32) {
        results.push(result.slice(i, i + 32));
      }
      return results;
    } finally {
      await this.worker.release();
    }
  }
}
