import { BaseObs } from './base_obs';
import { IObs, ObsUnlisten } from './types';

export type SomeObsList = IObs<unknown>[];
type ObsValue<TObs> = TObs extends IObs<infer TValue> ? TValue : never;
type ObsListValues<TObsList extends SomeObsList> = { [K in keyof TObsList]: ObsValue<TObsList[K]> };

export class CombinerObs<TObsList extends SomeObsList, TValues = ObsListValues<TObsList>> extends BaseObs<TValues> {
  private unlistenDeps?: ObsUnlisten;
  constructor(private readonly deps: TObsList) {
    super(deps.map(obs => obs.value) as unknown as TValues);
  }
  private refresh = () => {
    this.setAndEmit(this.deps.map(obs => obs.value) as unknown as TValues);
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
