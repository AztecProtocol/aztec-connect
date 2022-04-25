import { BaseObs } from './base_obs';
import { IObs, ObsUnlisten } from './types';

export class MapperObs<TIn, TOut> extends BaseObs<TOut> {
  private unlistenDep?: ObsUnlisten;
  private lastMappedDepValue: TIn;
  constructor(private readonly dep: IObs<TIn>, private readonly mapper: (value: TIn) => TOut) {
    super(mapper(dep.value));
    this.lastMappedDepValue = dep.value;
  }
  private refresh = (value: TIn) => {
    this.lastMappedDepValue = value;
    this.setAndEmit(this.mapper(value));
  };
  protected didReceiveFirstListener() {
    if (this.lastMappedDepValue !== this.dep.value) {
      this.refresh(this.dep.value);
    }
    this.unlistenDep = this.dep.listen(this.refresh);
  }
  protected didLoseLastListener() {
    this.unlistenDep?.();
    this.unlistenDep = undefined;
  }
}
