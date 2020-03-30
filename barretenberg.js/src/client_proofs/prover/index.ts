import { Crs } from '../../crs';
import { BarretenbergWorker } from '../../wasm/worker';

export class Prover {
  private pointTablePtr: number;

  constructor(private wasm: BarretenbergWorker, private crs: Crs) {
  }

  public async init() {
    const crsData = this.crs.getData();
    const crsPtr = await this.wasm.call("bbmalloc", crsData.length);
    this.wasm.transferToHeap(crsData, crsPtr);
    this.pointTablePtr = await this.wasm.call("create_pippenger_point_table", crsPtr, this.crs.numPoints);
    await this.wasm.call("bbfree", crsPtr);
  }

  public getPointTableAddr() {
    return this.pointTablePtr;
  }

  public async createProof(proverPtr: number) {
    // Call each round.
    // Launch workers for doing muls / ffts.
  }
}