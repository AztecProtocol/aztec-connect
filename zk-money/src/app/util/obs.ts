import createDebug from 'debug';
import { useEffect, useState } from 'react';

const debug = createDebug('zm:obs');

type Listener<T> = (state: T) => void;

export class Obs<T> {
  private listeners: Listener<T>[] = [];
  constructor(private _value: T) {}

  get value() {
    return this._value;
  }

  next(value: T) {
    this._value = value;
    const listeners = [...this.listeners];
    for (const l of listeners) l(value);
  }

  listen(listener: Listener<T>) {
    if (this.listeners.includes(listener)) {
      debug('already listening');
      return;
    }
    this.listeners.push(listener);
    const unlisten = () => {
      const idx = this.listeners.indexOf(listener);
      if (idx === -1) {
        debug('listener not found');
        return;
      }
      this.listeners.splice(idx, 1);
    };
    return unlisten;
  }
}

export function useObs<T>(obs: Obs<T>) {
  const [value, setValue] = useState(obs.value);
  useEffect(() => {
    setValue(obs.value);
    return obs.listen(setValue);
  }, [obs]);
  return value;
}
