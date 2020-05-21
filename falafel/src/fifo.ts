export class MemoryFifo<T> {
  private waiting: ((item: T | null) => void)[] = [];
  private items: T[] = [];
  private flushing: boolean = false;

  public length() {
    return this.items.length;
  }

  public async get(timeout?: number): Promise<T | null> {
    if (this.items.length) {
      return Promise.resolve(this.items.shift()!);
    }

    if (this.items.length === 0 && this.flushing) {
      return Promise.resolve(null);
    }

    return new Promise<T | null>((resolve, reject) => {
      this.waiting.push(resolve);

      if (timeout) {
        setTimeout(() => {
          const index = this.waiting.findIndex(r => r === resolve);
          if (index > -1) {
            this.waiting.splice(index, 1);
            const err = new Error('Timeout getting item from queue.');
            reject(err);
          }
        }, timeout * 1000);
      }
    });
  }

  public async put(item: T) {
    if (this.flushing) {
      return;
    } else if (this.waiting.length) {
      this.waiting.shift()!(item);
    } else {
      this.items.push(item);
    }
  }

  public end() {
    this.flushing = true;
    this.waiting.forEach(resolve => resolve(null));
  }

  public cancel() {
    this.flushing = true;
    this.items = [];
    this.waiting.forEach(resolve => resolve(null));
  }
}
