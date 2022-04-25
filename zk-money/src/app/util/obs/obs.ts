import { IObs, ObsListener, ObsUnlisten } from './types';
import { CombinerObs, ObsTuple } from './combiner_obs';
import { EmitMapper, EmitMapperObs } from './emit_mapper_obs';
import { InputObs } from './input_obs';
import { MapperObs } from './mapper_obs';
import { PromiseObs } from './promise_obs';
import { Emitter, EmitterObs } from './emitter_obs';
import { FilterObs } from './filter_obs';
import { ConstantObs } from './constant_obs';

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

  static input<T>(intialValue: T) {
    return new ChainableInputObs(intialValue);
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
}

class ChainableInputObs<T> extends Obs<T> {
  constructor(initialValue: T) {
    super(new InputObs(initialValue));
  }

  next(value: T) {
    (this.internalObs as InputObs<T>).next(value);
  }
}
