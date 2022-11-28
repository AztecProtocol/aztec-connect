import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache.js';
import type { DefiRecipe } from '../../../../alt-model/defi/types.js';
import createDebug from 'debug';
import { Obs } from '../../../../app/util/index.js';
import { Poller } from '../../../../app/util/poller.js';
import { LazyInitCacheMap } from '../../../../app/util/lazy_init_cache_map.js';

const debug = createDebug('zm:current_collateral_ratio_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createCurrentCollateralRatioPollerCache(recipes: DefiRecipe[], adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitCacheMap((recipeId: string) => {
    const recipe = recipes.find(x => x.id === recipeId);
    const adaptor = adaptorCache.get(recipeId);
    if (!adaptor || !recipe) return undefined;
    if (!adaptor.getCurrentCR) {
      throw new Error('Attempted to call unsupported method "getAuxData" on bridge adaptor');
    }
    const pollObs = Obs.constant(async () => {
      try {
        const data = await adaptor.getCurrentCR!();
        return data;
      } catch (err) {
        debug({ recipeId }, err);
        throw Error(`Failed to fetch current collateral ratio for "${recipe.name}".`);
      }
    });
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}
