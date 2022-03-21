import { BarretenbergWasm } from '../../wasm';

export class Grumpkin {
  constructor(private wasm: BarretenbergWasm) {}

  // prettier-ignore
  static one = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xcf, 0x13, 0x5e, 0x75, 0x06, 0xa4, 0x5d, 0x63,
    0x2d, 0x27, 0x0d, 0x45, 0xf1, 0x18, 0x12, 0x94, 0x83, 0x3f, 0xc4, 0x8d, 0x82, 0x3f, 0x27, 0x2c,
  ]);

  public mul(point: Uint8Array, scalar: Uint8Array) {
    this.wasm.transferToHeap(point, 0);
    this.wasm.transferToHeap(scalar, 64);
    this.wasm.call('ecc_grumpkin__mul', 0, 64, 96);
    return Buffer.from(this.wasm.sliceMemory(96, 160));
  }

  public batchMul(points: Uint8Array, scalar: Uint8Array, numPoints: number) {
    const mem = this.wasm.call('bbmalloc', points.length * 2);

    this.wasm.transferToHeap(points, mem);
    this.wasm.transferToHeap(scalar, 0);
    this.wasm.call('ecc_grumpkin__batch_mul', mem, 0, numPoints, mem + points.length);

    const result: Buffer = Buffer.from(this.wasm.sliceMemory(mem + points.length, mem + points.length + points.length));
    this.wasm.call('bbfree', mem);
    return result;
  }

  public getRandomFr() {
    this.wasm.call('ecc_grumpkin__get_random_scalar_mod_circuit_modulus', 0);
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public reduce512BufferToFr(uint512Buf: Buffer) {
    this.wasm.transferToHeap(uint512Buf, 0);
    this.wasm.call('ecc_grumpkin__reduce512_buffer_mod_circuit_modulus', 0, 64);
    return Buffer.from(this.wasm.sliceMemory(64, 96));
  }
}
