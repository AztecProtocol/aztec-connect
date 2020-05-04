import { BarretenbergWasm } from '../../wasm';

export class Blake2s {
  constructor(private wasm: BarretenbergWasm) {}

  public hashToField(data: Uint8Array) {
    const mem = this.wasm.call('bbmalloc', data.length);
    this.wasm.transferToHeap(data, mem);
    this.wasm.call('blake2s_to_field', mem, data.length, 0);
    this.wasm.call('bbfree', mem);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }
}
