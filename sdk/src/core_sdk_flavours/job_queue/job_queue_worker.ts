import { Pedersen } from '@aztec/barretenberg/crypto';
import { FftFactory } from '@aztec/barretenberg/fft';
import { Pippenger } from '@aztec/barretenberg/pippenger';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import { Job, JobQueueTarget } from './job';
import { JobQueueInterface } from './job_queue_interface';
import { JobQueueFftFactoryClient } from './job_queue_fft_factory';
import { JobQueuePedersenClient } from './job_queue_pedersen';
import { JobQueuePippengerClient } from './job_queue_pippenger';
import { createLogger } from '@aztec/barretenberg/debug';

const debug = createLogger('aztec:sdk:job_queue_worker');

const fetchInterval = 1000;
const pingInterval = 1000;

/**
 * Responsible for getting jobs from a JobQueue, processing them, and returning the result.
 */
export class JobQueueWorker {
  private running = false;
  private runningPromise!: Promise<void>;
  private pingTimeout!: NodeJS.Timeout;
  private interruptableSleep = new InterruptableSleep();

  private readonly pedersen: JobQueuePedersenClient;
  private readonly pippenger: JobQueuePippengerClient;
  private readonly fftFactory: JobQueueFftFactoryClient;

  constructor(private jobQueue: JobQueueInterface, pedersen: Pedersen, pippenger: Pippenger, fftFactory: FftFactory) {
    this.pedersen = new JobQueuePedersenClient(pedersen);
    this.pippenger = new JobQueuePippengerClient(pippenger);
    this.fftFactory = new JobQueueFftFactoryClient(fftFactory);
  }

  public async init(crsData: Uint8Array) {
    await this.pippenger.init(crsData);
  }

  public start() {
    this.jobQueue.on('new_job', this.notifyNewJob);
    this.running = true;
    this.runningPromise = this.runLoop();
  }

  public async stop() {
    this.jobQueue.off('new_job', this.notifyNewJob);
    this.running = false;
    this.interruptableSleep.interrupt();
    await this.runningPromise;
  }

  private notifyNewJob = () => {
    this.interruptableSleep.interrupt();
  };

  private async runLoop() {
    while (this.running) {
      try {
        const job = await this.jobQueue.getJob();
        if (job) {
          this.pingTimeout = setTimeout(() => this.ping(job.id), pingInterval);
          await this.processJob(job);
          clearTimeout(this.pingTimeout);
        } else {
          await this.interruptableSleep.sleep(fetchInterval);
        }
      } catch (e) {
        debug(e);
        clearTimeout(this.pingTimeout);
        await this.interruptableSleep.sleep(fetchInterval);
      }
    }
  }

  private async ping(jobId: number) {
    try {
      const currentJobId = await this.jobQueue.ping(jobId);
      if (currentJobId === jobId) {
        this.pingTimeout = setTimeout(() => this.ping(jobId), pingInterval);
      }
    } catch (e) {
      debug(e);
    }
  }

  private async processJob(job: Job) {
    let data: any;
    let error = '';
    try {
      data = await this.process(job);
    } catch (e: any) {
      debug(e);
      error = e.message;
    }
    try {
      await this.jobQueue.completeJob(job.id, data, error);
    } catch (e) {
      debug(e);
    }
  }

  private async process({ target, query, args }: Job) {
    switch (target) {
      case JobQueueTarget.PEDERSEN:
        return this.pedersen[query](...args);
      case JobQueueTarget.PIPPENGER:
        return this.pippenger[query](...args);
      case JobQueueTarget.FFT: {
        const [circuitSize, ...fftArgs] = args;
        const fft = await this.fftFactory.getFft(circuitSize);
        return fft[query](...fftArgs);
      }
    }
  }
}
