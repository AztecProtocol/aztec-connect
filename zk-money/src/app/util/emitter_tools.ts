import { arrEqual } from './arrays';

export function listenPoll(fn: () => void, interval: number) {
  fn();
  const task = setInterval(fn, interval);
  return () => clearInterval(task);
}

export class Poller {
  private lastPolled?: number;
  private task?: NodeJS.Timeout;
  constructor(private readonly poll: () => void, private readonly interval: number) {}

  loop = () => {
    this.lastPolled = Date.now();
    this.poll();
    this.task = setTimeout(this.loop, this.interval);
  };

  activate = () => {
    if (this.lastPolled === undefined) {
      this.loop();
    } else {
      const timeSinceLast = Date.now() - this.lastPolled;
      const delay = Math.max(0, Math.min(this.interval, this.interval - timeSinceLast));
      this.task = setTimeout(this.loop, delay);
    }

    return this.deactivate;
  };

  deactivate = () => {
    if (this.task !== undefined) clearTimeout(this.task);
  };
}

export function createMemo<T>() {
  let prevDeps: undefined | unknown[];
  let value: undefined | T;
  return function memo(factory: () => T, deps: unknown[]): T {
    if (!value || !prevDeps || !arrEqual(prevDeps, deps)) {
      value = factory();
    }
    prevDeps = deps;
    return value;
  };
}
