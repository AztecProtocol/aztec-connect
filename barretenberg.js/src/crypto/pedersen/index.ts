import { BarretenbergWasm } from '../../wasm';

export class Pedersen {
  constructor(private wasm: BarretenbergWasm) {}

  public compress(lhs: Uint8Array, rhs: Uint8Array) {
    this.wasm.transferToHeap(lhs, 0);
    this.wasm.transferToHeap(rhs, 32);
    this.wasm.call('pedersen_compress_fields', 0, 32, 64);
    return Buffer.from(this.wasm.sliceMemory(64, 96));
  }
}
