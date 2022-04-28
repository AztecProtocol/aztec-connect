import { EventEmitter } from 'events';
import { DispatchMsg } from '../transport';
import { Job } from './job';
import { JobQueueInterface } from './job_queue_interface';

export class JobQueueDispatch extends EventEmitter implements JobQueueInterface {
  constructor(private handler: (msg: DispatchMsg) => Promise<any>) {
    super();
  }

  async getJob(): Promise<Job | undefined> {
    return await this.handler({ fn: 'getJob', args: [] });
  }

  async ping(jobId: number) {
    return await this.handler({ fn: 'ping', args: [jobId] });
  }

  async completeJob(jobId: number, data?: any, error?: string) {
    return await this.handler({ fn: 'completeJob', args: [jobId, data, error] });
  }
}
