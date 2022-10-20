import { IObs, ObsUnlisten } from './types.js';

export class ConstantObs<T> implements IObs<T> {
  constructor(readonly value: T) {}
  listen(): ObsUnlisten {
    // Never changes - nothing to listen for
    return () => {};
  }
}
