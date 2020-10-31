import { serializeBufferArrayToVector } from '../../serialize';
import { BarretenbergWasm } from '../../wasm';

export class Pedersen {
  constructor(private wasm: BarretenbergWasm) {}

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
}
