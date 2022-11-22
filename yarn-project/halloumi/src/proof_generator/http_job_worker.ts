import { Server } from '../server.js';
import { Command, Protocol } from './http_job_protocol.js';
import { fetch } from '@aztec/barretenberg/iso_fetch';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { randomBytes } from 'crypto';

/**
 * Performs work for jobs retrieved from an HttpJobServer.
 * Requests one job at-a-time from the server, performs the corresponding work,
 * and notifies the job server with results upon completion. Keeps pinging the
 * job server while working to indicate that work for a job is still underway.
 */
export class HttpJobWorker {
  private id = randomBytes(32);
  private running = true;
  // Promise representing the execution of the main worker loop (`runLoop`)
  // This Promise is awaited when the worker is stopped
  private runningPromise!: Promise<void>;
  private log = createDebugLogger(`http_job_worker:${this.id.slice(0, 4).toString('hex')}`);
  private interruptableSleep = new InterruptableSleep();
  private abortController?: AbortController;
  // The timeout ID of the latest `setTimeout` that will trigger another ping to the job server
  private pingTimeout?: NodeJS.Timeout;
  // The ID representing the current sequence of pings for a certain job.
  // A sequence of pings should continue as long as the worker continues
  // work on a certain job. When work for a job is done, pingId increments
  // to indicate the end of that ping sequence.
  private pingId = 0;

  constructor(public readonly server: Server, private url = 'http://localhost:8082') {}

  public start() {
    this.log('start');
    // run the infinite worker loop and store its Promise to be awaited in `stop`
    this.runningPromise = this.runLoop();
  }

  async stop() {
    this.log('stop called');
    this.running = false; // `runLoop` shouldn't try to get more work
    this.abortController?.abort(); // abort any pending `/get-job` requests
    this.interruptableSleep.interrupt(); // interrupt sleep (e.g. in `runLoop` which should now exit)
    clearTimeout(this.pingTimeout!); // end ongoing sequence of pings if there is one
    await this.runningPromise; // wait for `runLoop` to finish
    this.log('stop complete');
  }

  /**
   * Retrieve and perform jobs as long as this worker is running
   *
   * @remarks
   * Get a job from the job server. Perform the corresponding work while pinging the server
   * to remind it that work is underway. Notify the job server with results when a job is done.
   * Repeat as long as worker is running.
   */
  private async runLoop() {
    while (this.running) {
      try {
        this.log('sending request for work');

        this.abortController = new AbortController();
        // ask the job server for a job to work on
        const resp = await fetch(`${this.url}/get-job`, {
          signal: this.abortController.signal, // abort if worker is stopped mid-request
        }).catch(() => undefined);
        if (!resp) {
          this.log('failed to get job');
          // no work found, try again in a second if the worker is still running
          if (this.running) {
            await this.interruptableSleep.sleep(1000);
          }
          continue;
        }

        const work = Buffer.from(await resp.arrayBuffer());
        if (!work.length) {
          this.log('no work received');
          await this.interruptableSleep.sleep(1000);
          continue;
        }

        this.log('received job:', Protocol.logUnpack(work).id);
        const { id, cmd, data } = Protocol.unpack(work);

        // Begin a sequence of pings to the job server to remind it that work is underway
        this.pingTimeout = setTimeout(() => this.ping(this.pingId, id), 1000);

        // Perform the actual work by processing the job's command.
        // Construct a response with the results (vk, proof, etc).
        // Include the job ID in response along with ACK on success, NACK on failure.
        const repBuf = await this.process(cmd, data)
          .then(res => Protocol.pack(id, Command.ACK, res))
          .catch((err: Error) => Protocol.pack(id, Command.NACK, Buffer.from(err.message)));

        // Notify the job server that this job is complete, and include the above-constructed response
        await fetch(`${this.url}/job-complete`, { body: repBuf, method: 'POST' }).catch(() => undefined);
      } catch (err: any) {
        console.log(err);
        await this.interruptableSleep.sleep(1000);
      } finally {
        // job is done, stop pinging job server for this job
        // clear any timeouts that would trigger another ping in this job's ping sequence
        clearTimeout(this.pingTimeout!);
        this.pingTimeout = undefined;
        // increment pingId forcing the end to this ping sequence and setting up for the next one
        this.pingId++;
      }
    }
    this.log('exiting function loop');
  }

  /**
   * Ping the job server to signify that the specified job is currently being worked on by this worker.
   *
   * @remarks
   * Ping the job server and then trigger a setTimeout which calls this method again after a second.
   * Each time a call to this function triggers a `setTimeout`, the worker's `pingTimeout` is updated with
   * the latest timer ID. That `pingTimeout` is cleared (via `clearTimeout` in `runLoop`) when work for this
   * job completes, which should in turn end the sequence of pings. Even if there is no active timeout to clear,
   * `runLoop` then changes the worker's `pingId` which forces this sequence of pings to end.
   *
   * @param pingId - the unique ID of this ping sequence
   * @param jobId - the ID of the specific job to ping for
   */
  private async ping(pingId: number, jobId: Buffer) {
    if (pingId != this.pingId) {
      // force this sequence of pings to end
      return;
    }
    this.log(`ping job: ${jobId.toString('hex')}`);
    // ping the job server
    await fetch(`${this.url}/ping?job-id=${jobId.toString('hex')}`).catch(() => undefined);
    // trigger a `setTimeout` to ping again in a second, save the timer id
    this.pingTimeout = setTimeout(() => this.ping(pingId, jobId), 1000);
    // return immediately without waiting for the timer to complete
  }

  /**
   * Process a command by triggering the actual execution of work in the Server
   */
  private async process(cmd: number, data: Buffer) {
    this.log(Command[cmd]);
    switch (cmd) {
      case Command.GET_JOIN_SPLIT_VK:
        return await this.server.getJoinSplitVerificationKey();
      case Command.GET_ACCOUNT_VK:
        return await this.server.getAccountVerificationKey();
      case Command.CREATE_PROOF:
        return await this.server.createProof(data);
    }
  }
}
