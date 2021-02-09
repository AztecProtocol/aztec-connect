import { serializeBufferArrayToVector } from '../../serialize';
import { BarretenbergWasm } from '../../wasm';
import { BarretenbergWorker } from '../../wasm/worker';

export class Pedersen {
  constructor(private wasm: BarretenbergWasm, private worker: BarretenbergWorker = wasm as any) {}

  public compress(lhs: Uint8Array, rhs: Uint8Array) {
    this.wasm.transferToHeap(lhs, 0);
    this.wasm.transferToHeap(rhs, 32);
    this.wasm.call('pedersen_compress_fields', 0, 32, 64);
    return Buffer.from(this.wasm.sliceMemory(64, 96));
  }

  public compressInputs(inputs: Buffer[]) {
    const inputVectors = serializeBufferArrayToVector(inputs);
    this.wasm.transferToHeap(inputVectors, 0);
    this.wasm.call('pedersen_compress', 0, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public compressWithHashIndex(inputs: Buffer[], hashIndex: number) {
    const inputVectors = serializeBufferArrayToVector(inputs);
    this.wasm.transferToHeap(inputVectors, 0);
    this.wasm.call('pedersen_compress_with_hash_index', 0, 0, hashIndex);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public hashToField(data: Uint8Array) {
    const mem = this.wasm.call('bbmalloc', data.length);
    this.wasm.transferToHeap(data, mem);
    this.wasm.call('pedersen_buffer_to_field', mem, data.length, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public async hashValuesToTree(values: Buffer[]) {
    const data = Buffer.concat(values);
    const mem = await this.worker.call('bbmalloc', data.length);
    await this.worker.transferToHeap(data, mem);
    const resultSize = await this.worker.call('pedersen_hash_to_tree', mem, data.length, 0);
    const resultPtr = Buffer.from(await this.worker.sliceMemory(0, 4)).readUInt32LE(0);
    const result = Buffer.from(await this.worker.sliceMemory(resultPtr, resultPtr + resultSize));
    await this.worker.call('bbfree', resultPtr);
    const results: Buffer[] = [];
    for (let i = 0; i < result.length; i += 32) {
      results.push(result.slice(i, i + 32));
    }
    return results;
  }
}
