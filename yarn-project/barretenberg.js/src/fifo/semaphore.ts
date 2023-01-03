import { MemoryFifo } from '@aztec/barretenberg/fifo';

export class Semaphore {
  private readonly queue = new MemoryFifo<boolean>();

  constructor(size: number) {
    new Array(size).fill(true).map(() => this.queue.put(true));
  }

  public async acquire() {
    await this.queue.get();
  }

  public release() {
    this.queue.put(true);
  }
}
