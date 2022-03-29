import EventEmitter from 'events';
import { Job, JobQueueTarget } from './job';
import { JobQueueInterface } from './job_queue_interface';

interface PendingJob {
  job: Job;
  resolve(data: any): void;
  reject(error: Error): void;
  timestamp: number;
}

const pingElapsed = 2000;

export class JobQueue extends EventEmitter implements JobQueueInterface {
  private jobId = 0;
  private pendingJobs: PendingJob[] = [];

  constructor() {
    super();
  }

  async getJob() {
    const [pendingJob] = this.pendingJobs;
    const now = Date.now();
    if (!pendingJob || now - pendingJob.timestamp < pingElapsed) {
      return;
    }

    pendingJob.timestamp = now;

    return pendingJob.job;
  }

  async ping(jobId: number) {
    const [pendingJob] = this.pendingJobs;
    if (!pendingJob) {
      return;
    }
    if (pendingJob.job.id === jobId) {
      const now = Date.now();
      pendingJob.timestamp = now;
    }
    return pendingJob.job.id;
  }

  async completeJob(jobId: number, data?: any, error?: string) {
    const [pendingJob] = this.pendingJobs;
    if (!pendingJob || pendingJob.job.id !== jobId) {
      return;
    }

    if (error) {
      pendingJob.reject(new Error(error));
    } else {
      pendingJob.resolve(data);
    }
    this.pendingJobs = this.pendingJobs.filter(j => j !== pendingJob);
  }

  async createJob(target: JobQueueTarget, query: string, args: any[] = []) {
    return new Promise<any>((resolve, reject) => {
      const job = { id: this.jobId++, target, query, args };
      this.pendingJobs.push({ job, resolve, reject, timestamp: 0 });
      this.emit('new_job');
    });
  }
}
