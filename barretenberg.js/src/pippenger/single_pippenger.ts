import { BarretenbergWorker } from '../wasm/worker';
import { Pippenger } from './pippenger';
import { Transfer } from 'threads';

export class SinglePippenger implements Pippenger {
  private pippengerPtr!: number;
  private numPoints!: number;

  constructor(private wasm: BarretenbergWorker) {}

  public async init(crsData: Uint8Array) {
    const crsPtr = await this.wasm.call('bbmalloc', crsData.length);
    this.numPoints = crsData.length / 64;
    await this.wasm.transferToHeap(crsData, crsPtr);
    this.pippengerPtr = await this.wasm.call('new_pippenger', crsPtr, this.numPoints);
    await this.wasm.call('bbfree', crsPtr);
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
    return this.wasm;
  }
}
