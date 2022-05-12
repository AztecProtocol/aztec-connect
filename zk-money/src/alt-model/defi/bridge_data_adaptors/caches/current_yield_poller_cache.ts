import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import createDebug from 'debug';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';

const debug = createDebug('zm:current_yield_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createCurrentAssetYieldPollerCache(
  defiRecipesObs: DefiRecipesObs,
  adaptorObsCache: BridgeDataAdaptorObsCache,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitDeepCacheMap(([recipeId, interactionNonce]: [string, number]) => {
    const pollObs = Obs.combine([defiRecipesObs, adaptorObsCache.get(recipeId), remoteAssetsObs]).map(
      ([recipes, adaptor, assets]) => {
        const recipe = recipes?.find(x => x.id === recipeId)!;
        if (!adaptor || !assets || !recipe) return undefined;
        if (!adaptor.getCurrentYield)
          throw new Error('Attempted to call unsupported method "getCurrentYield" on bridge adaptor');
        const { valueEstimationInteractionAssets } = recipe;
        return async () => {
          try {
            const values = await adaptor.getCurrentYield!(BigInt(interactionNonce));
            return { assetId: valueEstimationInteractionAssets.outA.id, value: values[0] };
          } catch (err) {
            debug({ recipeId, interactionNonce }, err);
            throw new Error(`Failed to fetch bridge current yield for "${recipe.name}".`);
          }
        };
      },
    );
    return new Poller(pollObs, POLL_INTERVAL);
  });
}
