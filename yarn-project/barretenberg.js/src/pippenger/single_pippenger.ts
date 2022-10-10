import { BarretenbergWasm, BarretenbergWorker } from '../wasm/index.js';
import { Pippenger } from './pippenger.js';
import { Transfer } from '../transport/index.js';

export class SinglePippenger implements Pippenger {
  private pippengerPtr!: number;
  private numPoints!: number;

  constructor(private wasm: BarretenbergWorker | BarretenbergWasm) {}

  public async init(crsData: Uint8Array) {
    this.numPoints = crsData.length / 64;
    // The allocation is as per the point_table_size in pippenger.hpp.
    // The crs data does not have the affine_one point at the start.
    // affine_one is filled in at the first position by new_pippenger before building the point table.
    // The last point is discarded, so we still end up with numPoints points.
    const crsPtr = await this.wasm.call('bbmalloc', 64 * (this.numPoints * 2 + 16));
    await this.wasm.transferToHeap(crsData.slice(0, -64), crsPtr + 64);
    this.pippengerPtr = await this.wasm.call('new_pippenger', crsPtr, this.numPoints);
  }

  public async destroy() {
    await this.wasm.call('delete_pippenger', this.pippengerPtr);
  }

  public async pippengerUnsafe(scalars: Uint8Array, from: number, range: number) {
    const mem = await this.wasm.call('bbmalloc', scalars.length);
    await this.wasm.transferToHeap(Transfer(scalars, [scalars.buffer]) as any, mem);
    await this.wasm.call('pippenger_unsafe', this.pippengerPtr, mem, from, range, 0);
    await this.wasm.call('bbfree', mem);
    return Buffer.from(await this.wasm.sliceMemory(0, 96));
  }

  public async sumElements(buffer: Uint8Array) {
    const mem = await this.wasm.call('bbmalloc', buffer.length);
    await this.wasm.transferToHeap(buffer, mem);
    await this.wasm.call('g1_sum', mem, buffer.length / 96, 0);
    await this.wasm.call('bbfree', mem);
    return Buffer.from(await this.wasm.sliceMemory(0, 96));
  }

  public getPointer() {
    return this.pippengerPtr;
  }

  public getWorker() {
    return this.wasm as BarretenbergWorker;
  }
}
