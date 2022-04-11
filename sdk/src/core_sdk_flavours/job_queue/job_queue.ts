import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import EventEmitter from 'events';
import { Job, JobQueueTarget } from './job';
import { JobQueueInterface } from './job_queue_interface';

interface PendingJob {
  job: Job;
  resolve(data: any): void;
  reject(error: Error): void;
  timestamp: number;
}

const broadcastInterval = 1000;
const pingElapsed = 2000;

export class JobQueue extends EventEmitter implements JobQueueInterface {
  private jobId = 0;
  private pendingJobs = new MemoryFifo<PendingJob>();
  private pending?: PendingJob;
  private interruptableSleep = new InterruptableSleep();

  constructor() {
    super();
    this.processPendingJobs();
  }

  private async processPendingJobs() {
    while (true) {
      const job = await this.pendingJobs.get();
      if (!job) {
        break;
      }

      await this.broadcastNewJob(job);
    }
  }

  private async broadcastNewJob(job: PendingJob) {
    this.pending = job;
    while (this.pending) {
      if (Date.now() - this.pending.timestamp >= pingElapsed) {
        this.emit('new_job');
      }
      await this.interruptableSleep.sleep(broadcastInterval);
    }
  }

  async getJob() {
    const now = Date.now();
    const pendingJob = this.pending;
    if (!pendingJob || now - pendingJob.timestamp < pingElapsed) {
      return;
    }

    pendingJob.timestamp = now;

    return pendingJob.job;
  }

  async ping(jobId: number) {
    if (!this.pending) {
      return;
    }
    if (this.pending.job.id === jobId) {
      const now = Date.now();
      this.pending.timestamp = now;
    }
    return this.pending.job.id;
  }

  async completeJob(jobId: number, data?: any, error?: string) {
    if (!this.pending || this.pending.job.id !== jobId) {
      return;
    }

    if (error) {
      this.pending.reject(new Error(error));
    } else {
      this.pending.resolve(data);
    }
    this.pending = undefined;
    this.interruptableSleep.interrupt();
  }

  async createJob(target: JobQueueTarget, query: string, args: any[] = []) {
    return new Promise<any>((resolve, reject) => {
      const job = { id: this.jobId++, target, query, args };
      this.pendingJobs.put({ job, resolve, reject, timestamp: 0 });
    });
  }
}
