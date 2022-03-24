import { MemoryFifo } from '@aztec/barretenberg/fifo';

export class SerialQueue {
  private readonly queue = new MemoryFifo<() => Promise<void>>();

  constructor() {
    this.queue.process(fn => fn());
  }

  public destroy() {
    this.queue.cancel();
  }

  public async push<T>(fn: () => Promise<T>): Promise<T> {
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
}
