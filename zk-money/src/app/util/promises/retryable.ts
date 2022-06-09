import { Fullfiller } from './fullfiller';

export class Retryable<T> {
  private retryFullfiller?: Fullfiller<void>;
  constructor(private readonly fn: () => Promise<T>) {}

  retry() {
    if (!this.retryFullfiller) {
      throw new Error('No ongoing promise to retry');
    }
    this.retryFullfiller.resolve();
  }

  async run(): Promise<T> {
    while (true) {
      this.retryFullfiller = new Fullfiller();
      const resultProm = this.fn();
      const userHitRetryBeforeFinished = await Promise.race([
        this.retryFullfiller?.promise.then(() => true),
        resultProm.then(() => false),
      ]);
      if (!userHitRetryBeforeFinished) {
        this.retryFullfiller = undefined;
        return resultProm;
      }
    }
  }
}
