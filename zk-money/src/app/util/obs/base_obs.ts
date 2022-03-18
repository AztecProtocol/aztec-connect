import createDebug from 'debug';
import { ObsListener, ObsUnlisten } from './types';
const debug = createDebug('zm:obs');

export class BaseObs<T> {
  private listeners: ObsListener<T>[] = [];
  constructor(private _value: T) {}

  get value() {
    return this._value;
  }

  listen(listener: ObsListener<T>): ObsUnlisten {
    if (this.listeners.includes(listener)) {
      debug('already listening');
      return () => {};
    }
    this.listeners.push(listener);
    if (this.listeners.length === 1) this.didReceiveFirstListener();
    const unlisten = () => {
      const idx = this.listeners.indexOf(listener);
      if (idx === -1) {
        debug('listener not found');
        return;
      }
      this.listeners.splice(idx, 1);
      if (this.listeners.length === 0) this.didLoseLastListener();
    };
    return unlisten;
  }

  protected setAndEmit(value: T) {
    if (value === this._value) return;
    this._value = value;
    const listeners = [...this.listeners];
    for (const l of listeners) l(value);
  }

  protected didReceiveFirstListener() {}
  protected didLoseLastListener() {}
}
