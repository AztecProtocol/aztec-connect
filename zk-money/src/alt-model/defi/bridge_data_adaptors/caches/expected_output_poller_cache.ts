import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const POLL_INTERVAL = 5 * 60 * 1000;

export function createExpectedOutputPollerCache(
  defiRecipesObs: DefiRecipesObs,
  adaptorObsCache: BridgeDataAdaptorObsCache,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitDeepCacheMap(([recipeId, auxData, inputAmount]: [string, bigint, bigint]) => {
    const pollObs = Obs.combine([defiRecipesObs, adaptorObsCache.get(recipeId), remoteAssetsObs]).map(
      ([recipes, adaptor, assets]) => {
        const recipe = recipes?.find(x => x.id === recipeId);
        if (!adaptor || !assets || !recipe) return undefined;
        const { valueEstimationInteractionAssets } = recipe;
        const { inA, inB, outA, outB } = toAdaptorArgs(valueEstimationInteractionAssets);
        return () =>
          adaptor.adaptor
            .getExpectedOutput(inA, inB, outA, outB, auxData, inputAmount)
            .then(values => ({ assetId: valueEstimationInteractionAssets.outA.id, value: values[0] }));
      },
    );
    return new Poller(pollObs, POLL_INTERVAL);
  });
}
