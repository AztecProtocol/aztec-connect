import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import createDebug from 'debug';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const debug = createDebug('expected_yearly_output_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createExpectedYearlyOutputPollerCache(
  defiRecipesObs: DefiRecipesObs,
  adaptorObsCache: BridgeDataAdaptorObsCache,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitDeepCacheMap(([recipeId, auxData, inputAmount]: [string, bigint, bigint]) => {
    const pollObs = Obs.combine([defiRecipesObs, adaptorObsCache.get(recipeId), remoteAssetsObs]).map(
      ([recipes, adaptor, assets]) => {
        const recipe = recipes?.find(x => x.id === recipeId)!;
        if (!adaptor || !assets || !recipe) return undefined;
        if (!adaptor.isYield) throw new Error('Can only call getExpectedYearlyOuput for yield bridges.');
        const { valueEstimationInteractionAssets } = recipe;
        const { inA, inB, outA, outB } = toAdaptorArgs(valueEstimationInteractionAssets);
        return async () => {
          try {
            const values = await adaptor.adaptor.getExpectedYearlyOuput(inA, inB, outA, outB, auxData, inputAmount);
            return { assetId: valueEstimationInteractionAssets.outA.id, value: values[0] };
          } catch (err) {
            debug({ recipeId, inA, inB, outA, outB, auxData, inputAmount }, err);
            throw new Error(`Failed to fetch bridge expected yearly output for "${recipe.name}".`);
          }
        };
      },
    );
    return new Poller(pollObs, POLL_INTERVAL);
  });
}
