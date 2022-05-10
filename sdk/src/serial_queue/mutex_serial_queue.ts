import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { Mutex, MutexDatabase } from '@aztec/barretenberg/mutex';
import { SerialQueue } from './serial_queue';

export class MutexSerialQueue implements SerialQueue {
  private readonly queue = new MemoryFifo<() => Promise<void>>();
  private readonly mutex: Mutex;

  constructor(db: MutexDatabase, name: string, expiry = 5000, tryLockInterval = 2000, pingInterval = 2000) {
    this.queue.process(fn => fn());
    this.mutex = new Mutex(db, name, expiry, tryLockInterval, pingInterval);
  }

  public length() {
    return this.queue.length();
  }

  public cancel() {
    this.queue.cancel();
  }

  public async push<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.put(async () => {
        await this.mutex.lock();
        try {
          const res = await fn();
          resolve(res);
        } catch (e) {
          reject(e);
        } finally {
          await this.mutex.unlock();
        }
      });
    });
  }
}
