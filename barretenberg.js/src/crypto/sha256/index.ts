import { BarretenbergWasm } from '../../wasm';

export class Sha256 {
  constructor(private wasm: BarretenbergWasm) {}

  public hash(data: Buffer) {
    const mem = this.wasm.call('bbmalloc', data.length + 32);
    this.wasm.transferToHeap(data, mem);
    this.wasm.call('sha256__hash', mem, data.length, mem + data.length);
    const result: Buffer = Buffer.from(this.wasm.sliceMemory(mem + data.length, mem + data.length + 32));
    this.wasm.call('bbfree', mem);
    return result;
  }
}
