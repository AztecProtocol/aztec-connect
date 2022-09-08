import { MemorySerialQueue } from '../serial_queue';

export class CacheRequest<T> {
  private res!: T;
  private validUntil = 0;
  private serialQueue = new MemorySerialQueue();

  constructor(private readonly fn: () => Promise<T>, private readonly expireAfter = 1000) {}

  public async get() {
    return await this.serialQueue.push(async () => {
      if (Date.now() > this.validUntil) {
        this.res = await this.fn();
      }
      this.validUntil = Date.now() + this.expireAfter;
      return this.res;
    });
  }

  public clearCache() {
    this.validUntil = 0;
  }
}
