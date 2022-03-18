class Success<T> {
  constructor(readonly result: T) {}
}

export class CachedStep<T> {
  private success?: Success<T>;
  async exec(fn: () => Promise<T>) {
    if (!this.success) this.success = new Success(await fn());
    return this.success.result;
  }
}
