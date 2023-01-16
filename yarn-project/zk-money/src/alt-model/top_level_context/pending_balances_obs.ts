import { Obs } from '../../app/util/index.js';
import type { IObs } from '../../app/util/obs/types.js';

type PendingBalancesObsValue = {};

export type PendingBalances = {
  [assetId: number]: bigint;
};

export class PendingBalancesObs implements IObs<PendingBalancesObsValue> {
  obs = Obs.input<PendingBalances>({});

  get value() {
    return this.obs.value;
  }

  listen = this.obs.listen.bind(this.obs);

  set(pendingBalances: PendingBalances) {
    this.obs.next(pendingBalances);
  }

  clean() {
    this.obs.next({});
  }
}
