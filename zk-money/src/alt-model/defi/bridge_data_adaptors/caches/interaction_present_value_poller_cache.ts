import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import createDebug from 'debug';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';

const debug = createDebug('zm:interaction_present_value_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createInteractionPresentValuePollerCache(
  adaptorObsCache: BridgeDataAdaptorObsCache,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitDeepCacheMap(([recipeId, interactionNonce]: [string, bigint]) => {
    const pollObs = Obs.combine([adaptorObsCache.get(recipeId), remoteAssetsObs]).map(([adaptor, assets]) => {
      if (!adaptor || !assets) return undefined;
      const { getInteractionPresentValue } = adaptor;

      if (!getInteractionPresentValue)
        throw new Error('Attempted to call unsupported method "getInteractionPresentValue" on bridge adaptor');
      return async () => {
        try {
          const values = await getInteractionPresentValue!(interactionNonce);
          return { assetId: Number(values[0].assetId), value: values[0].amount };
        } catch (err) {
          debug({ recipeId, interactionNonce }, err);
          throw new Error(`Failed to fetch bridge interaction present value for "${recipeId}".`);
        }
      };
    });
    return new Poller(pollObs, POLL_INTERVAL);
  });
}
