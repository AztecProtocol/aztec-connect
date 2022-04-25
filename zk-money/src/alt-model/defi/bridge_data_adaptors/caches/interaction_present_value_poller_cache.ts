import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { BridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';

const POLL_INTERVAL = 5 * 60 * 1000;

export function createInteractionPresentValuePollerCache(
  adaptorObsCache: BridgeDataAdaptorObsCache,
  remoteAssetsObs: RemoteAssetsObs,
) {
  return new LazyInitDeepCacheMap(([recipeId, interactionNonce]: [string, bigint]) => {
    const pollObs = Obs.combine([adaptorObsCache.get(recipeId), remoteAssetsObs]).map(([adaptor, assets]) => {
      if (!adaptor || !assets) return undefined;
      return () =>
        adaptor.adaptor
          .getInteractionPresentValue(interactionNonce)
          .then(values => ({ assetId: Number(values[0].assetId), value: values[0].amount }));
    });
    return new Poller(pollObs, POLL_INTERVAL);
  });
}
