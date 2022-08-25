import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache';
import type { DefiRecipe } from 'alt-model/defi/types';
import createDebug from 'debug';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorAsset } from '../bridge_adaptor_util';

const debug = createDebug('zm:expected_yield_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createExpectedAssetYieldPollerCache(recipes: DefiRecipe[], adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitCacheMap((recipeId: string) => {
    const recipe = recipes.find(x => x.id === recipeId);
    const adaptor = adaptorCache.get(recipeId);
    if (!adaptor || !recipe) return undefined;
    if (!adaptor.getAPR) {
      throw new Error('Attempted to call unsupported method "getAPR" on bridge adaptor');
    }

    const yieldAsset = toAdaptorAsset(recipe.flow.enter.outA);
    const pollObs = Obs.constant(async () => {
      try {
        const value = await adaptor.getAPR!(yieldAsset);
        return value;
      } catch (err) {
        debug(recipeId, err);
        throw new Error(`Failed to fetch bridge expected yield for "${recipe.name}".`);
      }
    });
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}
