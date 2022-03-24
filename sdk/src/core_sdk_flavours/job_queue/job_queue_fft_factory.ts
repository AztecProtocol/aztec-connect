import { Fft, FftFactory } from '@aztec/barretenberg/fft';
import { JobQueueTarget } from './job';
import { JobQueueBackend } from './job_queue_backend';

class JobQueueFft implements Fft {
  private readonly target = JobQueueTarget.FFT;

  constructor(private queue: JobQueueBackend, private circuitSize: number) {}

  async fft(coefficients: Uint8Array, constant: Uint8Array) {
    return this.queue.createJob(this.target, 'fft', [this.circuitSize, coefficients, constant]);
  }

  async ifft(coefficients: Uint8Array) {
    return this.queue.createJob(this.target, 'ifft', [this.circuitSize, coefficients]);
  }
}

export class JobQueueFftFactory implements FftFactory {
  constructor(private queue: JobQueueBackend) {}

  async createFft(circuitSize: number) {
    return new JobQueueFft(this.queue, circuitSize);
  }
}

class JobQueueFftClient {
  constructor(private fftInstance: Fft) {}

  async fft(coefficients: Uint8Array, constant: Uint8Array) {
    return this.fftInstance.fft(coefficients, constant);
  }

  async ifft(coefficients: Uint8Array) {
    return this.fftInstance.ifft(coefficients);
  }
}

export class JobQueueFftFactoryClient {
  private ffts: { [circuitSize: number]: JobQueueFftClient } = {};

  constructor(private fftFactory: FftFactory) {}

  async createFft(circuitSize: number) {
    if (!this.ffts[circuitSize]) {
      const fft = await this.fftFactory.createFft(circuitSize);
      this.ffts[circuitSize] = new JobQueueFftClient(fft);
    }
    return this.ffts[circuitSize];
  }

  async getFft(circuitSize: number) {
    return this.createFft(circuitSize);
  }
}
