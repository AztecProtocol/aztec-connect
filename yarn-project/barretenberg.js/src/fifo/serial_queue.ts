import { MemoryFifo } from '@aztec/barretenberg/fifo';

export class SerialQueue {
  private readonly queue = new MemoryFifo<() => Promise<void>>();
  private runningPromise!: Promise<void>;

  public start() {
    this.runningPromise = this.queue.process(fn => fn());
  }

  public length() {
    return this.queue.length();
  }

  public cancel() {
    this.queue.cancel();
  }

  public async end() {
    this.queue.end();
    await this.runningPromise;
  }

  public put<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.put(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  // Awaiting this ensures the queue is empty before resuming.
  public async syncPoint() {
    await this.put(async () => {});
  }
}
