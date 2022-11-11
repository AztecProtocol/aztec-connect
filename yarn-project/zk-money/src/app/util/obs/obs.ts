import { IObs, ObsListener, ObsUnlisten } from './types.js';
import { CombinerObs, ObsTuple } from './combiner_obs.js';
import { EmitMapper, EmitMapperObs } from './emit_mapper_obs.js';
import { InputObs } from './input_obs.js';
import { MapperObs } from './mapper_obs.js';
import { PromiseObs } from './promise_obs.js';
import { Emitter, EmitterObs } from './emitter_obs.js';
import { FilterObs } from './filter_obs.js';
import { ConstantObs } from './constant_obs.js';
import { Fullfiller } from '../promises/index.js';

export class Obs<T> implements IObs<T> {
  constructor(protected readonly internalObs: IObs<T>) {}

  get value() {
    return this.internalObs.value;
  }

  listen(listener: ObsListener<T>): ObsUnlisten {
    return this.internalObs.listen(listener);
  }

  static constant<T>(value: T) {
    return new Obs(new ConstantObs(value));
  }

  static input<T>(initialValue: T) {
    return new ChainableInputObs(initialValue);
  }

  static promise<T>(promise: Promise<T>, initialValue: T) {
    return new Obs(new PromiseObs(promise, initialValue));
  }

  static combine<TValues extends unknown[]>(deps: [...ObsTuple<TValues>]) {
    return new Obs(new CombinerObs(deps));
  }

  static emitter<T>(emitter: Emitter<T>, initialValue: T) {
    return new Obs(new EmitterObs(emitter, initialValue));
  }

  map<TOut>(mapper: (value: T) => TOut) {
    return new Obs(new MapperObs<T, TOut>(this, mapper));
  }

  mapEmitter<TOut>(emitter: EmitMapper<T, TOut>, initialValue: TOut) {
    return new Obs(new EmitMapperObs(this, emitter, initialValue));
  }

  filter(filter: (value: T, prevValue: T) => boolean) {
    return new Obs(new FilterObs(this, filter));
  }

  async whenDefined<TWithoutUndefined = Exclude<T, undefined>>(): Promise<TWithoutUndefined> {
    if (this.value !== undefined) return this.value as unknown as TWithoutUndefined;
    const fullfiller = new Fullfiller<TWithoutUndefined>();
    const unlisten = this.listen(value => {
      if (value !== undefined) {
        unlisten();
        fullfiller.resolve(value as unknown as TWithoutUndefined);
      }
    });
    return fullfiller.promise;
  }

  async whenNext(): Promise<T> {
    const fullfiller = new Fullfiller<T>();
    const unlisten = this.listen(value => {
      unlisten();
      fullfiller.resolve(value);
    });
    return fullfiller.promise;
  }
}

export class ChainableInputObs<T> extends Obs<T> {
  constructor(initialValue: T) {
    super(new InputObs(initialValue));
  }

  next(value: T) {
    (this.internalObs as InputObs<T>).next(value);
  }
}
