import { Fullfiller } from '../../app/util/index.js';

export class CancelledError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CancelledError';
  }
}

export type ThrowIfCancelled = <T>(promise: Promise<T>) => Promise<T>;

export function createThrowIfCancelled() {
  const cancelFullfiller = new Fullfiller<void>();
  const throwIfCancelled: ThrowIfCancelled = async promise => {
    const cancelled = await Promise.race([cancelFullfiller.promise.then(() => true), promise.then(() => false)]);
    if (cancelled) throw new CancelledError();
    const result = await promise;
    return result;
  };
  return { cancel: cancelFullfiller.resolve, throwIfCancelled };
}

export type Emit<T> = (emitted: T) => void;

export type Flow<TArgs extends unknown[], TEmitted, TReturn> = (
  emitState: Emit<TEmitted>,
  throwIfCancelled: ThrowIfCancelled,
  ...args: TArgs
) => Promise<TReturn>;
