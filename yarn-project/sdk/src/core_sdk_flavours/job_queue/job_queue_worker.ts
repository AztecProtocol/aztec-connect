import { Pedersen } from '@aztec/barretenberg/crypto';
import { FftFactory } from '@aztec/barretenberg/fft';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { NoteDecryptor } from '@aztec/barretenberg/note_algorithms';
import { Pippenger } from '@aztec/barretenberg/pippenger';
import { Job, JobQueueTarget } from './job.js';
import { JobQueueFftFactoryClient } from './job_queue_fft_factory.js';
import { JobQueueInterface } from './job_queue_interface.js';
import { JobQueueNoteDecryptorClient } from './job_queue_note_decryptor.js';
import { JobQueuePedersenClient } from './job_queue_pedersen.js';
import { JobQueuePippengerClient } from './job_queue_pippenger.js';

const debug = createDebugLogger('aztec:sdk:job_queue_worker');

const backgroundFetchDelay = 500;
const pingInterval = 1000;

/**
 * Responsible for getting jobs from a JobQueue, processing them, and returning the result.
 */
export class JobQueueWorker {
  private newJobPromise?: Promise<void>;
  private pingTimeout!: NodeJS.Timeout;

  private readonly noteDecryptor: JobQueueNoteDecryptorClient;
  private readonly pedersen: JobQueuePedersenClient;
  private readonly pippenger: JobQueuePippengerClient;
  private readonly fftFactory: JobQueueFftFactoryClient;

  constructor(
    private jobQueue: JobQueueInterface,
    noteDecryptor: NoteDecryptor,
    pedersen: Pedersen,
    pippenger: Pippenger,
    fftFactory: FftFactory,
  ) {
    this.noteDecryptor = new JobQueueNoteDecryptorClient(noteDecryptor);
    this.pedersen = new JobQueuePedersenClient(pedersen);
    this.pippenger = new JobQueuePippengerClient(pippenger);
    this.fftFactory = new JobQueueFftFactoryClient(fftFactory);
  }

  public async init(crsData: Uint8Array) {
    await this.pippenger.init(crsData);
  }

  public start() {
    this.jobQueue.on('new_job', this.notifyNewJob);
  }

  public async stop() {
    this.jobQueue.off('new_job', this.notifyNewJob);
    await this.newJobPromise;
  }

  private notifyNewJob = async () => {
    if (this.newJobPromise) {
      return;
    }

    this.newJobPromise = this.fetchAndProcess();
    await this.newJobPromise;
    this.newJobPromise = undefined;
  };

  private async fetchAndProcess() {
    if (document.hidden) {
      // We want foreground tabs to pick up a job first.
      await new Promise(resolve => setTimeout(resolve, backgroundFetchDelay));
    }
    try {
      const job = await this.jobQueue.getJob();
      if (job) {
        this.pingTimeout = setTimeout(() => this.ping(job.id), pingInterval);
        await this.processJob(job);
      }
    } catch (e) {
      debug(e);
    } finally {
      clearTimeout(this.pingTimeout);
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
      case JobQueueTarget.NOTE_DECRYPTOR:
        return this.noteDecryptor[query](...args);
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
