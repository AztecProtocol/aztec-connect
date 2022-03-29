import { Pippenger } from '@aztec/barretenberg/pippenger';
import { JobQueueTarget } from './job';
import { JobQueue } from './job_queue';

export class JobQueuePippenger implements Pippenger {
  private readonly target = JobQueueTarget.PIPPENGER;

  constructor(private queue: JobQueue) {}

  async init() {
    // Don't need to do anything, as the actual work is done by a job queue worker.
  }

  async pippengerUnsafe(scalars: Uint8Array, from: number, range: number) {
    const result = await this.queue.createJob(this.target, 'pippengerUnsafe', [scalars, from, range]);
    return Buffer.from(result);
  }
}

export class JobQueuePippengerClient {
  constructor(private pippenger: Pippenger) {}

  async init(crsData: Uint8Array) {
    await this.pippenger.init(crsData);
  }

  async pippengerUnsafe(scalars: Uint8Array, from: number, range: number) {
    const result = await this.pippenger.pippengerUnsafe(scalars, from, range);
    return new Uint8Array(result);
  }
}
