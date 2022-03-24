import { BaseObs } from './base_obs';
import { IObs, ObsUnlisten } from './types';

export class FilterObs<T> extends BaseObs<T> {
  private unlistenDep?: ObsUnlisten;
  constructor(private readonly dep: IObs<T>, private readonly filter: (value: T, prevValue: T) => boolean) {
    super(dep.value);
  }
  private refresh = (value: T) => {
    if (this.filter(value, this.value)) {
      this.setAndEmit(value);
    }
  };
  protected didReceiveFirstListener() {
    this.refresh(this.dep.value);
    this.unlistenDep = this.dep.listen(this.refresh);
  }
  protected didLoseLastListener() {
    this.unlistenDep?.();
    this.unlistenDep = undefined;
  }
}
