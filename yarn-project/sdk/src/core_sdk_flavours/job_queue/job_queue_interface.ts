import EventEmitter from 'events';
import { Job } from './job.js';

export interface JobQueueInterface extends EventEmitter {
  on(name: 'new_job', cb: () => void): this;

  getJob(): Promise<Job | undefined>;
  ping(jobId: number): Promise<number | undefined>;
  completeJob(jobId: number, data?: any, error?: string): Promise<void>;
}
