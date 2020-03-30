import { Crs } from '../../crs';
import { BarretenbergWorker } from '../../wasm/worker';
import { Pippenger } from '../../pippenger';

export class Prover {
  private pippenger: Pippenger;
  private g2Data: Uint8Array;

  constructor(private wasm: BarretenbergWorker, private crs: Crs) {
    this.pippenger = new Pippenger(this.wasm);
    this.g2Data = crs.getG2Data();
  }

  public async init() {
    await this.pippenger.init(this.crs.getData());
  }

  public getPointTableAddr() {
    return this.pippenger.getPointTableAddr();
  }

  public getNumCrsPoints() {
    return this.pippenger.getNumCrsPoints();
  }

  public getG2Data() {
    return this.g2Data;
  }

  public async createProof(proverPtr: number) {
    const circuitSize = await this.wasm.call("prover_get_circuit_size", proverPtr);
    console.log(`reported circuit size: ${circuitSize}`);
    await this.wasm.call("prover_execute_preamble_round", proverPtr);
    await this.processProverQueue(proverPtr, circuitSize);
    await this.wasm.call("prover_execute_first_round", proverPtr);
    await this.processProverQueue(proverPtr, circuitSize);
    await this.wasm.call("prover_execute_second_round", proverPtr);
    await this.processProverQueue(proverPtr, circuitSize);
    await this.wasm.call("prover_execute_third_round", proverPtr);
    await this.processProverQueue(proverPtr, circuitSize);
    await this.wasm.call("prover_execute_fourth_round", proverPtr);
    await this.processProverQueue(proverPtr, circuitSize);
    await this.wasm.call("prover_execute_fifth_round", proverPtr);
    await this.processProverQueue(proverPtr, circuitSize);
    const proofSize = await this.wasm.call("prover_export_proof", proverPtr, 0);
    const proofPtr = Buffer.from(await this.wasm.sliceMemory(0, 4)).readUInt32LE(0);
    return Buffer.from(await this.wasm.sliceMemory(proofPtr, proofPtr + proofSize));
  }

  private async processProverQueue(proverPtr: number, circuitSize: number) {
    const jobs = await this.wasm.call("prover_get_num_queued_scalar_multiplications", proverPtr);
    console.log(`jobs: ${jobs}`);
    for (let i=0; i<jobs; ++i) {
      const scalarsPtr = await this.wasm.call("prover_get_scalar_multiplication_data", proverPtr, i);
      const scalars = await this.wasm.sliceMemory(scalarsPtr, scalarsPtr + circuitSize*32);
      const result = await this.pippenger.pippengerUnsafe(scalars, 0, circuitSize);
      console.log(result);
      await this.wasm.transferToHeap(result, 0);
      await this.wasm.call("prover_put_scalar_multiplication_data", proverPtr, 0, i);
    }
  }
}