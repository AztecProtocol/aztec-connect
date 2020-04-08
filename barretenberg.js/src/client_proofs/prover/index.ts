import { BarretenbergWorker } from '../../wasm/worker';
import { Pippenger } from '../../pippenger';
import createDebug from 'debug';
import { Fft } from '../../fft';

const debug = createDebug('bb:prover');

class Timer {
  private start: number;

  constructor(msg: string) {
    debug(msg);
    this.start = new Date().getTime();
  }

  public mark(msg: string) {
    const diff = new Date().getTime() - this.start;
    debug(`${msg} (ms:${diff})`);
    this.start = new Date().getTime();
  }
}

export class Prover {
  constructor(private wasm: BarretenbergWorker, private pippenger: Pippenger, private fft: Fft) {}

  public async createProof(proverPtr: number) {
    const circuitSize = await this.wasm.call('prover_get_circuit_size', proverPtr);
    const timer = new Timer('enter createProof');
    await this.wasm.call('prover_execute_preamble_round', proverPtr);
    timer.mark('preamble end');
    await this.processProverQueue(proverPtr, circuitSize);
    timer.mark('first round start');
    await this.wasm.call('prover_execute_first_round', proverPtr);
    timer.mark('first round end');
    await this.processProverQueue(proverPtr, circuitSize);
    timer.mark('second round start');
    await this.wasm.call('prover_execute_second_round', proverPtr);
    timer.mark('second round end');
    await this.processProverQueue(proverPtr, circuitSize);
    timer.mark('third round start');
    await this.wasm.call('prover_execute_third_round', proverPtr);
    timer.mark('third round end');
    await this.processProverQueue(proverPtr, circuitSize);
    timer.mark('fourth round start');
    await this.wasm.call('prover_execute_fourth_round', proverPtr);
    timer.mark('fourth round end');
    await this.processProverQueue(proverPtr, circuitSize);
    timer.mark('fifth round start');
    await this.wasm.call('prover_execute_fifth_round', proverPtr);
    timer.mark('fifth round end');
    await this.processProverQueue(proverPtr, circuitSize);
    timer.mark('done');
    const proofSize = await this.wasm.call('prover_export_proof', proverPtr, 0);
    const proofPtr = Buffer.from(await this.wasm.sliceMemory(0, 4)).readUInt32LE(0);
    return Buffer.from(await this.wasm.sliceMemory(proofPtr, proofPtr + proofSize));
  }

  private async processProverQueue(proverPtr: number, circuitSize: number) {
    await this.wasm.call('prover_get_work_queue_item_info', proverPtr, 0);
    const jobInfo = Buffer.from(await this.wasm.sliceMemory(0, 12));
    const scalarJobs = jobInfo.readUInt32LE(0);
    const fftJobs = jobInfo.readUInt32LE(4);
    const ifftJobs = jobInfo.readUInt32LE(8);

    debug(`starting jobs scalars:${scalarJobs} ffts:${fftJobs} iffts:${ifftJobs}`);

    for (let i = 0; i < scalarJobs; ++i) {
      const scalarsPtr = await this.wasm.call('prover_get_scalar_multiplication_data', proverPtr, i);
      const scalars = await this.wasm.sliceMemory(scalarsPtr, scalarsPtr + circuitSize * 32);
      const result = await this.pippenger.pippengerUnsafe(scalars, 0, circuitSize);
      await this.wasm.transferToHeap(result, 0);
      await this.wasm.call('prover_put_scalar_multiplication_data', proverPtr, 0, i);
    }

    const jobs: { coefficients: Uint8Array, constant?: Uint8Array, inverse: boolean, i: number}[] = [];
    for (let i = 0; i < fftJobs; ++i) {
      const coeffsPtr = await this.wasm.call('prover_get_fft_data', proverPtr, 0, i);
      const coefficients = await this.wasm.sliceMemory(coeffsPtr, coeffsPtr + circuitSize * 32);
      const constant = await this.wasm.sliceMemory(0, 32);
      jobs.push({coefficients, constant, inverse: false, i});
    }

    for (let i = 0; i < ifftJobs; ++i) {
      const coeffsPtr = await this.wasm.call('prover_get_ifft_data', proverPtr, i);
      const coefficients = await this.wasm.sliceMemory(coeffsPtr, coeffsPtr + circuitSize * 32);
      jobs.push({coefficients, inverse: true, i});
    }

    await Promise.all(jobs.map(({inverse, coefficients, constant, i}) =>
      inverse ? this.doIfft(proverPtr, i, circuitSize, coefficients) : this.doFft(proverPtr, i, circuitSize, coefficients, constant!)));
  }

  private async doFft(proverPtr: number, i: number, circuitSize: number, coefficients: Uint8Array, constant: Uint8Array) {
      const result = await this.fft.fft(coefficients, constant);
      const resultPtr = await this.wasm.call("bbmalloc", circuitSize * 32);
      await this.wasm.transferToHeap(result, resultPtr)
      await this.wasm.call('prover_put_fft_data', proverPtr, resultPtr, i);
      await this.wasm.call("bbfree", resultPtr);
  }

  private async doIfft(proverPtr: number, i: number, circuitSize: number, coefficients: Uint8Array) {
      const result = await this.fft.ifft(coefficients);
      const resultPtr = await this.wasm.call("bbmalloc", circuitSize * 32);
      await this.wasm.transferToHeap(result, resultPtr)
      await this.wasm.call('prover_put_ifft_data', proverPtr, resultPtr, i);
      await this.wasm.call("bbfree", resultPtr);
  }
}
