import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache';
import type { DefiRecipe } from 'alt-model/defi/types';
import createDebug from 'debug';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const debug = createDebug('zm:expected_yield_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createExpectedAssetYieldPollerCache(recipes: DefiRecipe[], adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitDeepCacheMap(([recipeId, auxData, inputAmount]: [string, bigint, bigint]) => {
    const recipe = recipes.find(x => x.id === recipeId);
    const adaptor = adaptorCache.get(recipeId);
    if (!adaptor || !recipe) return undefined;
    if (!adaptor.getExpectedYield) {
      throw new Error('Attempted to call unsupported method "getExpectedYield" on bridge adaptor');
    }

    const { valueEstimationInteractionAssets } = recipe;
    const { inA, inB, outA, outB } = toAdaptorArgs(valueEstimationInteractionAssets);
    const pollObs = Obs.constant(async () => {
      try {
        const values = await adaptor.getExpectedYield!(inA, inB, outA, outB, auxData, inputAmount);
        return values[0];
      } catch (err) {
        debug({ recipeId, inA, inB, outA, outB, auxData, inputAmount }, err);
        throw new Error(`Failed to fetch bridge expected yield for "${recipe.name}".`);
      }
    });
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}
