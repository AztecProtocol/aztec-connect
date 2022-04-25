import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';
import { toAdaptorArgs } from '../bridge_adaptor_util';

const POLL_INTERVAL = 5 * 60 * 1000;

export function createMarketSizePollerCache(
  defiRecipesObs: DefiRecipesObs,
  adaptorObsCache: BridgeDataAdaptorObsCache,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitDeepCacheMap(([recipeId, auxData]: [string, bigint]) => {
    const pollObs = Obs.combine([defiRecipesObs, adaptorObsCache.get(recipeId), remoteAssetsObs]).map(
      ([recipes, adaptor, assets]) => {
        const recipe = recipes?.find(x => x.id === recipeId);
        if (!adaptor || !assets || !recipe) return undefined;
        if (!adaptor.isYield) throw new Error('Can only call getMarketObs for yield bridges.');
        const { inA, inB, outA, outB } = toAdaptorArgs(recipe.flow.enter);
        return () =>
          adaptor.adaptor
            .getMarketSize(inA, inB, outA, outB, auxData)
            .then(values => values.map(x => ({ assetId: Number(x.assetId), value: x.amount })));
      },
    );
    return new Poller(pollObs, POLL_INTERVAL);
  });
}
