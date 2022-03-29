import { Pedersen, SinglePedersen } from '@aztec/barretenberg/crypto';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { JobQueueTarget } from './job';
import { JobQueue } from './job_queue';

export class JobQueuePedersen extends SinglePedersen implements Pedersen {
  private readonly target = JobQueueTarget.PEDERSEN;

  constructor(wasm: BarretenbergWasm, private queue: JobQueue) {
    super(wasm);
  }

  async hashToTree(values: Buffer[]) {
    const result = await this.queue.createJob(this.target, 'hashToTree', [values.map(v => new Uint8Array(v))]);
    return result.map(v => Buffer.from(v));
  }
}

export class JobQueuePedersenClient {
  constructor(private pedersen: Pedersen) {}

  async hashToTree(values: Uint8Array[]) {
    const result = await this.pedersen.hashToTree(values.map(v => Buffer.from(v)));
    return result.map(v => new Uint8Array(v));
  }
}
