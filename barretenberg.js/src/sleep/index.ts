export class InterruptableSleep {
  private interruptResolve = () => {};
  private interruptPromise = new Promise<void>(resolve => (this.interruptResolve = resolve));
  private timeouts: NodeJS.Timeout[] = [];

  public async sleep(ms: number) {
    let timeout!: NodeJS.Timeout;
    const promise = new Promise(resolve => (timeout = setTimeout(resolve, ms)));
    this.timeouts.push(timeout);
    await Promise.race([promise, this.interruptPromise]);
    clearTimeout(timeout);
    this.timeouts.splice(this.timeouts.indexOf(timeout), 1);
  }

  public interrupt() {
    this.interruptResolve();
    this.interruptPromise = new Promise(resolve => (this.interruptResolve = resolve));
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
