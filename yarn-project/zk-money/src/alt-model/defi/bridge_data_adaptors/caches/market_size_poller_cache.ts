import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache.js';
import type { DefiRecipe } from '../../../../alt-model/defi/types.js';
import createDebug from 'debug';
import { Obs } from '../../../../app/util/index.js';
import { Poller } from '../../../../app/util/poller.js';
import { LazyInitDeepCacheMap } from '../../../../app/util/lazy_init_cache_map.js';
import { toAdaptorArgs } from '../bridge_adaptor_util.js';

const debug = createDebug('zm:market_size_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createMarketSizePollerCache(recipes: DefiRecipe[], adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitDeepCacheMap(([recipeId, auxData]: [string, number]) => {
    const adaptor = adaptorCache.get(recipeId);
    const recipe = recipes.find(x => x.id === recipeId);
    if (!adaptor || !recipe) return undefined;
    if (!adaptor.getMarketSize) {
      throw new Error('Attempted to call unsupported method "getMarketSize" on bridge adaptor');
    }

    const { inA, inB, outA, outB } = toAdaptorArgs(recipe.flow.enter);
    const pollObs = Obs.constant(async () => {
      try {
        const values = await adaptor.getMarketSize!(inA, inB, outA, outB, auxData);
        return values;
      } catch (err) {
        debug({ recipeId, inA, inB, outA, outB, auxData }, err);
        throw new Error(`Failed to fetch bridge market size for "${recipe.name}".`);
      }
    });
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}
