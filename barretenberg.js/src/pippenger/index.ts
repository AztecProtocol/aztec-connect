import { BarretenbergWorker } from '../wasm/worker';

export class Pippenger {
  private pointTablePtr!: number;
  private numPoints!: number;

  constructor(protected wasm: BarretenbergWorker) {}

  public async init(crsData: Uint8Array) {
    const crsPtr = await this.wasm.call("bbmalloc", crsData.length);
    this.numPoints = crsData.length / 64;
    this.wasm.transferToHeap(crsData, crsPtr);
    this.pointTablePtr = await this.wasm.call("create_pippenger_point_table", crsPtr, this.numPoints);
    console.log(`point table at addr: ${this.pointTablePtr}`);
    await this.wasm.call("bbfree", crsPtr);
  }

  public getPointTableAddr() {
    return this.pointTablePtr;
  }

  public getNumCrsPoints() {
    return this.numPoints;
  }

  public async destroy() {
    await this.wasm.call("bbfree", this.pointTablePtr);
  }

  public async pippengerUnsafe(scalars: Uint8Array, from: number, range: number) {
    console.log(`pip unsafe: ${scalars.length}`);
    const mem = await this.wasm.call("bbmalloc", scalars.length);
    await this.wasm.transferToHeap(scalars, mem);
    await this.wasm.call("pippenger_unsafe", mem, from, range, this.pointTablePtr, 0);
    await this.wasm.call("bbfree", mem);
    return Buffer.from(await this.wasm.sliceMemory(0, 96));
  }

  public async sumElements(buffer: Uint8Array) {
    const mem = await this.wasm.call("bbmalloc", buffer.length);
    await this.wasm.transferToHeap(buffer, mem);
    await this.wasm.call("g1_sum", mem, buffer.length / 96, 0);
    await this.wasm.call("bbfree", mem);
    return Buffer.from(await this.wasm.sliceMemory(0, 96));
  }
}