import { arrEqual } from '../arrays';
import { BaseObs } from './base_obs';
import { IObs, ObsUnlisten } from './types';

export type ObsTuple<TValues> = { [K in keyof TValues]: IObs<TValues[K]> };

export class CombinerObs<TValues extends unknown[]> extends BaseObs<TValues> {
  private unlistenDeps?: ObsUnlisten;
  constructor(private readonly deps: [...ObsTuple<TValues>]) {
    super(deps.map(obs => obs.value) as unknown as TValues);
  }
  private refresh = () => {
    const nextValue = this.deps.map(obs => obs.value) as unknown as TValues;
    if (!arrEqual(nextValue, this.value)) {
      this.setAndEmit(nextValue);
    }
  };
  protected didReceiveFirstListener() {
    this.refresh();
    const depsUnlistens = this.deps.map(dep => dep.listen(this.refresh));
    this.unlistenDeps = () => {
      for (const unlisten of depsUnlistens) unlisten();
    };
  }
  protected didLoseLastListener() {
    this.unlistenDeps?.();
    this.unlistenDeps = undefined;
  }
}
