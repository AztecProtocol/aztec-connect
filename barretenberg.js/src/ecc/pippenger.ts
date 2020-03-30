import { BarretenbergWorker } from '../wasm/worker';

export class Pippenger {
  constructor(protected wasm: BarretenbergWorker) {}

  public async pippengerUnsafe(scalars: Uint8Array, from: number, range: number, numPoints: number, resultBuf: SharedArrayBuffer, index: number) {
    const mem = await this.wasm.call("bbmalloc", scalars.length);
    await this.wasm.transferToHeap(scalars, mem);
    await this.wasm.call("pippenger_unsafe", mem, from, range, await this.wasm.getMonomialsAddress(), numPoints, 0);
    await this.wasm.call("bbfree", mem);
    const r = Buffer.from(await this.wasm.sliceMemory(0, 96));

    const result8 = new Uint8Array(resultBuf);
    r.copy(result8, 4 + (96*index));

    const result32 = new Int32Array(resultBuf);
    Atomics.add(result32, 0, 1);
    Atomics.notify(result32, 0, 1);
  }

  public async sumElements(buffer: Uint8Array) {
    const mem = await this.wasm.call("bbmalloc", buffer.length);
    await this.wasm.transferToHeap(buffer, mem);
    await this.wasm.call("g1_sum", mem, buffer.length / 96, 0);
    await this.wasm.call("bbfree", mem);
    return Buffer.from(await this.wasm.sliceMemory(0, 96));
  }
}