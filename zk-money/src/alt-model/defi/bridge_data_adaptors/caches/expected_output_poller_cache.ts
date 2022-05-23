import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache';
import type { DefiRecipe } from 'alt-model/defi/types';
import createDebug from 'debug';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const debug = createDebug('zm:expected_output_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createExpectedOutputPollerCache(recipes: DefiRecipe[], adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitDeepCacheMap(([recipeId, auxData, inputAmount]: [string, bigint, bigint]) => {
    const adaptor = adaptorCache.get(recipeId);
    const recipe = recipes.find(x => x.id === recipeId);
    if (!adaptor || !recipe) return undefined;
    const { valueEstimationInteractionAssets } = recipe;
    const { inA, inB, outA, outB } = toAdaptorArgs(valueEstimationInteractionAssets);
    const pollObs = Obs.constant(async () => {
      try {
        const values = await adaptor.getExpectedOutput(inA, inB, outA, outB, auxData, inputAmount);
        return { assetId: valueEstimationInteractionAssets.outA.id, value: values[0] };
      } catch (err) {
        debug({ recipeId, inA, inB, outA, outB, auxData, inputAmount }, err);
        throw new Error(`Failed to fetch bridge expected output for "${recipe.name}".`);
      }
    });
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}
