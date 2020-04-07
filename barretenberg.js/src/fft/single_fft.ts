import { BarretenbergWorker } from '../wasm/worker';
import { Transfer } from 'threads';

export class SingleFft {
  private domainPtr!: number;

  constructor(private wasm: BarretenbergWorker) {}

  public async init(circuitSize: number) {
    this.domainPtr = await this.wasm.call("new_evaluation_domain", circuitSize);
  }

  public async destroy() {
    await this.wasm.call("delete_evaluation_domain", this.domainPtr);
  }

  public async fft(coefficients: Uint8Array, constant: Uint8Array) {
    const circuitSize = coefficients.length / 32;
    const newPtr = await this.wasm.call('bbmalloc', coefficients.length);
    await this.wasm.transferToHeap(Transfer(coefficients, [coefficients.buffer]) as any, newPtr);
    await this.wasm.transferToHeap(Transfer(constant, [constant.buffer]) as any, 0);
    await this.wasm.call('coset_fft_with_generator_shift', newPtr, 0, this.domainPtr);
    const result = await this.wasm.sliceMemory(newPtr, newPtr + circuitSize * 32);
    await this.wasm.call('bbfree', newPtr);
    return result;
  }

  public async ifft(coefficients: Uint8Array) {
    const circuitSize = coefficients.length / 32;
    const newPtr = await this.wasm.call('bbmalloc', coefficients.length);
    await this.wasm.transferToHeap(Transfer(coefficients, [coefficients.buffer]) as any, newPtr);
    await this.wasm.call('ifft', newPtr, this.domainPtr);
    const result = await this.wasm.sliceMemory(newPtr, newPtr + circuitSize * 32);
    await this.wasm.call('bbfree', newPtr);
    return result;
  }
}