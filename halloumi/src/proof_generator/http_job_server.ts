import { ProofGenerator } from './proof_generator';
import { randomBytes } from '@aztec/barretenberg/crypto';
import debug from 'debug';
import { Command, Protocol } from './http_job_protocol';
import http from 'http';
import Koa, { DefaultState, Context } from 'koa';
import Router from 'koa-router';
import { PromiseReadable } from 'promise-readable';
import { InterruptableSleep } from './http_job_worker';
import { MemoryFifo } from '@aztec/barretenberg/fifo';

interface Job {
  // A unique, random 32 byte job id. Ensures we never conflict request/response ids in event of restarts.
  id: Buffer;
  // The command id.
  cmd: Command;
  // If a job becomes older than the ackTimeout, it's time is reset and it's issued to another worker.
  timestamp: number;
  // The request data to be sent to the worker.
  data?: Buffer;
  // Once the worker returns data, we call resolve to unblock the caller.
  resolve: (result: Buffer) => void;
  // Not used, but could be used to throw an error to the caller.
  reject: (err: Error) => void;
}

/**
 * An HTTP server which maintains a list of jobs (function calls as per the ProofGenerator interface).
 * These jobs can be requested, serviced, and responses returned by clients.
 * A job request will block if no work is available. The block will awake every second to search for expired jobs.
 * Every job request is serialized to ensure that a single client will poll the job queue at any one time.
 * If a new job arrives in the meantime, the block will also be awoken to then return the new job.
 */
export class HttpJobServer implements ProofGenerator {
  private jobs: Job[] = [];
  private server: http.Server;
  private log = debug('http_job_server');
  private running = true;
  private serialQueue = new MemoryFifo<() => Promise<void>>();
  private interruptableSleep = new InterruptableSleep();

  constructor(private port = 8082, private ackTimeout = 5000) {
    const router = new Router<DefaultState, Context>();

    router.get('/get-job', async (ctx: Koa.Context) => {
      ctx.body = await this.serialExecute(() => this.getWork());
      ctx.status = 200;
      this.log('sent work');
    });

    router.post('/job-complete', async (ctx: Koa.Context) => {
      const stream = new PromiseReadable(ctx.req);
      const buf = (await stream.readAll()) as Buffer;
      await this.completeJob(buf);
      ctx.status = 200;
    });

    router.get('/ping', async (ctx: Koa.Context) => {
      const jobId = Buffer.from(ctx.query['job-id'] as string, 'hex');
      await this.ping(jobId);
      ctx.status = 200;
    });

    const app = new Koa();
    app.use(router.routes());
    app.use(router.allowedMethods());

    this.server = http.createServer(app.callback());

    // Start processing serialization queue.
    this.serialQueue.process(fn => fn());
  }

  private serialExecute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.serialQueue.put(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  private async getWork() {
    this.log('received request for work');
    // A request for work. Serve back the newest new (timestamp 0) or expired job.
    while (this.running) {
      const now = new Date().getTime();
      const job = this.jobs.find(j => now - j.timestamp > this.ackTimeout);
      if (job) {
        job.timestamp = now;
        return Protocol.pack(job.id, job.cmd, job.data);
      } else {
        // No jobs. Block for 1 second, or until awoken.
        this.log('sleep');
        await this.interruptableSleep.sleep(1000);
        this.log('awoke');
      }
    }
    return Buffer.alloc(0);
  }

  private async completeJob(buf: Buffer) {
    this.log('received result for job: ', Protocol.logUnpack(buf).id);
    const { id, cmd, data } = Protocol.unpack(buf);

    const index = this.jobs.findIndex(j => id.equals(j.id));
    if (index === -1) {
      return;
    }

    // Remove the completed job from the job set.
    const [job] = this.jobs.splice(index, 1);

    if (cmd === Command.ACK) {
      job.resolve(data);
      this.log('resolved');
    } else {
      job.reject(new Error(data.toString('utf8')));
    }
  }

  private async ping(jobId: Buffer) {
    this.log('ping for job:', jobId.toString('hex'));
    const job = this.jobs.find(j => j.id.equals(jobId));
    if (job) {
      job.timestamp = new Date().getTime();
    }
  }

  public async start() {
    this.server.listen(this.port);
    console.log(`Proof job server listening on port ${this.port}.`);
  }

  public async stop() {
    this.log('stop called');
    this.running = false;
    this.server.close();
    this.serialQueue.cancel();
    this.interruptableSleep.interrupt();
    this.log('stop complete');
  }

  /**
   * DEPRECATE.
   * Once upon a time it was anticipated we would want to interrupt workers in some conditions. These conditions
   * are looking increasingly rare, so no need to cancel as long as our cluster can pick up additional work.
   * If we *do* want this, it's the final nail in the coffin for this approach and should use AMQP so can fan out reset.
   */
  public async reset() {}

  public async getJoinSplitVk() {
    return this.createJob(Command.GET_JOIN_SPLIT_VK);
  }

  public async getAccountVk() {
    return this.createJob(Command.GET_ACCOUNT_VK);
  }

  public createProof(data: Buffer): Promise<Buffer> {
    return this.createJob(Command.CREATE_PROOF, data);
  }

  private createJob(cmd: Command, data?: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const job = { id: randomBytes(32), timestamp: 0, cmd, data, resolve, reject };
      this.jobs.push(job);
      this.interruptableSleep.interrupt();
    });
  }
}
