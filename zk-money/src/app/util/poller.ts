import { Obs } from './obs';
import { IObs } from './obs/types';

export class Poller<T> {
  private readonly lastPolledObs = Obs.input<undefined | number>(undefined);
  obs: Obs<T | undefined>;

  constructor(pollObs: IObs<undefined | (() => Promise<T>)>, interval: number) {
    this.obs = Obs.combine([pollObs, this.lastPolledObs]).mapEmitter<T | undefined>(([poll, lastPolled], emit) => {
      if (!poll) return;
      const refresh = async () => {
        const value = await poll();
        emit(value);
        this.lastPolledObs.next(Date.now());
      };
      if (lastPolled === undefined) {
        refresh();
      } else {
        const timeSinceLast = Date.now() - lastPolled;
        const delay = Math.max(0, Math.min(interval, interval - timeSinceLast));
        const task = setTimeout(refresh, delay);
        return () => clearTimeout(task);
      }
      return undefined;
    }, undefined);
  }

  invalidate() {
    this.lastPolledObs.next(undefined);
  }
}
