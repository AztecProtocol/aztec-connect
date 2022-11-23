import { ProofGenerator } from './proof_generator.js';
import { randomBytes } from '@aztec/barretenberg/crypto';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { InterruptError } from '@aztec/barretenberg/errors';
import { Command, Protocol } from './http_job_protocol.js';
import http from 'http';
import Koa, { DefaultState, Context } from 'koa';
import Router from 'koa-router';
import { PromiseReadable } from 'promise-readable';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import { MemoryFifo } from '@aztec/barretenberg/fifo';

interface Job {
  // A unique, random 32 byte job id. Ensures we never conflict request/response ids in event of restarts.
  id: Buffer;
  // The command id. Represents a specific task to be performed by a worker.
  cmd: Command;
  // A timestamp representing the last time a job was worked on.
  // If a job becomes older than the ackTimeout, it can be issued to another worker.
  // A brand new job has its timestamp initialized to 0 indicating that it has never been worked on.
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
  private log = createDebugLogger('http_job_server');
  private running = true;
  // Queue that will execute jobs sequentially with the help of `serialExecute`
  private serialQueue = new MemoryFifo<() => Promise<void>>();
  private interruptableSleep = new InterruptableSleep();
  // Promise representing the execution of the job-serializion queue (`serialQueue`)
  // This Promise is awaited when the server is stopped at which point the queue is canceled
  private runningPromise: Promise<void>;

  constructor(private port = 8082, private ackTimeout = 5000) {
    const router = new Router<DefaultState, Context>();

    // A worker can request the next unclaimed job for it to perform
    router.get('/get-job', async (ctx: Koa.Context) => {
      // respond with work that can be performed
      // retrieval of work is serialized to prevent simultaneous polls of the job queue
      ctx.body = await this.serialExecute(() => this.getWork());
      ctx.status = 200;
      this.log('get-job returned');
    });

    // A worker can notify the server upon job completion with the requested data
    router.post('/job-complete', async (ctx: Koa.Context) => {
      const stream = new PromiseReadable(ctx.req);
      // request should include job info and the results of work performed (the requested data) when successful
      const buf = (await stream.readAll()) as Buffer;
      this.completeJob(buf);
      ctx.status = 200;
    });

    // A worker can notify the server that a job is still being worked on.
    router.get('/ping', (ctx: Koa.Context) => {
      const jobId = Buffer.from(ctx.query['job-id'] as string, 'hex');
      this.ping(jobId);
      ctx.status = 200;
    });

    const app = new Koa();
    app.use(router.routes());
    app.use(router.allowedMethods());

    this.server = http.createServer(app.callback());

    // Start processing serialization queue.
    // Once the queue begins processing here, any jobs put into the queue
    // will be automatically executed first-in-first-out.
    this.runningPromise = this.serialQueue.process(fn => fn());
  }

  /**
   * Serialize job requests to ensure only a single client can poll the job queue at any one time.
   *
   * @remarks
   * Puts a job into the `serialQueue` to be executed automatically in FIFO order
   *
   * @param fn - the job request function to execute (e.g. a call to `getWork`)
   *
   * @returns a Promise that resolves when the `serialQueue` completes this request for work
   */
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

  /**
   * Respond to a request for work. Serve back the oldest unclaimed job that can be worked on.
   *
   * @remarks
   * An 'unclaimed job' refers to a new (timestamp 0) or expired job (hasn't been worked-on/pinged in a while)
   *
   * @returns job `id`, `cmd` and `data` packed into a buffer.
   * Empty buffer is returned if server is stopped before a job is found.
   */
  private async getWork() {
    this.log('received request for work');
    // Continuously try to get an unclaimed job, waiting if none is found and then trying again
    while (this.running) {
      const now = new Date().getTime();
      // Serve back the oldest unclaimed job (new (timestamp 0) or expired)
      const job = this.jobs.find(j => now - j.timestamp > this.ackTimeout);
      if (job) {
        // Timestamp the job, indicating that the last time it was worked on is 'now'
        job.timestamp = now;
        return Protocol.pack(job.id, job.cmd, job.data);
      } else {
        // No jobs. Block for 1 second, or until awoken.
        this.log('sleep');
        await this.interruptableSleep.sleep(1000);
        this.log('awoke');
      }
    }
    // Should only happen if server is stopped before this function finds work to return
    return Buffer.alloc(0);
  }

  /**
   * A worker has completed a job. Mark it done and unblock the original caller.
   *
   * @remarks Remove job from jobs list. On success, job `cmd` should be ACK in which case the corresponding
   * job Promise is resolved, otherwise it is rejected. Upon resolve/reject of Promise, the original caller
   * (of the server method that created the job) is unblocked. Note: job promises are created in `createJob`.
   *
   * @param buf - buffer containing `id`, `cmd`, and `data` of completed job.
   * Worker should set `cmd` to ACK when work was completed successfully.
   */
  private completeJob(buf: Buffer) {
    this.log('received result for job: ', Protocol.logUnpack(buf).id);
    const { id, cmd, data } = Protocol.unpack(buf);

    const index = this.jobs.findIndex(j => id.equals(j.id));
    if (index === -1) {
      // no such job found
      return;
    }

    // Remove the completed job from the job list
    const [job] = this.jobs.splice(index, 1);

    if (cmd === Command.ACK) {
      // Job was completed successfully, resolve corresponding Promise
      job.resolve(data);
      this.log('resolved');
    } else {
      // Job failed, reject corresponding Promise
      job.reject(new Error(data.toString('utf8')));
    }
  }

  /**
   * Update a job's timestamp to indicate that it is still being worked on.
   *
   * @remarks
   * If a job has not been pinged in ackTimeout, it "expires" and can be assigned to another worker.
   * Worker should periodically ping to indicate that work is still in progress for a job.
   */
  private ping(jobId: Buffer) {
    this.log('ping for job:', jobId.toString('hex'));
    const job = this.jobs.find(j => j.id.equals(jobId));
    if (job) {
      job.timestamp = new Date().getTime();
    }
  }

  public start() {
    this.server.listen(this.port); // http server
    console.log(`Proof job server listening on port ${this.port}.`);
    return Promise.resolve();
  }

  public async stop() {
    this.log('stop called');
    this.running = false; // `getWork` shouldn't try to get another job
    this.server.close(); // http server
    this.serialQueue.cancel(); // discard jobs from queue
    this.interruptableSleep.interrupt(); // interrupt sleep (e.g. in `getWork` which should now exit)
    await this.runningPromise; // wait for `serialQueue`'s `process` call to finish
    this.log('stop complete');
  }

  /**
   * Interrupt/reject all uncompleted jobs
   */
  public interrupt() {
    for (const job of this.jobs) {
      job.reject(new InterruptError('Interrupted.'));
    }
    return Promise.resolve();
  }

  public getJoinSplitVk() {
    return this.createJob(Command.GET_JOIN_SPLIT_VK);
  }

  public getAccountVk() {
    return this.createJob(Command.GET_ACCOUNT_VK);
  }

  public createProof(data: Buffer): Promise<Buffer> {
    return this.createJob(Command.CREATE_PROOF, data);
  }

  /**
   * Create a job of a certain type to be executed by a worker
   *
   * @param cmd - enum specifying the type of work that should be performed for this job
   * @param data - buffer representing the data for proof creation (for a CREATE_PROOF job)
   *
   * @returns a Promise that will be resolved (in `completeJob`) after a worker completes
   * the associated work and submits a `/job-complete` request to this server with the results.
   */
  private createJob(cmd: Command, data?: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Initialize a job's timestamp to 0 indicating that it has never been worked on
      const job = { id: randomBytes(32), timestamp: 0, cmd, data, resolve, reject };
      // Adds the new job to the jobs list (to later be retrieved by a worker via `/get-job`->`getWork()`)
      this.jobs.push(job);
      // Interrupt sleep (e.g. in `getWork`) now that a new job is ready
      this.interruptableSleep.interrupt();
    });
  }
}
