import type { BridgeDataAdaptorCache } from './bridge_data_adaptor_cache';
import createDebug from 'debug';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';
import { LazyInitDeepCacheMap } from 'app/util/lazy_init_cache_map';

const debug = createDebug('zm:interaction_present_value_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createInteractionPresentValuePollerCache(adaptorCache: BridgeDataAdaptorCache) {
  return new LazyInitDeepCacheMap(([recipeId, interactionNonce]: [string, bigint]) => {
    const adaptor = adaptorCache.get(recipeId);
    if (!adaptor) return undefined;

    if (!adaptor.getInteractionPresentValue) {
      throw new Error('Attempted to call unsupported method "getInteractionPresentValue" on bridge adaptor');
    }
    const pollObs = Obs.constant(async () => {
      try {
        const values = await adaptor.getInteractionPresentValue!(interactionNonce);
        return { assetId: Number(values[0].assetId), value: values[0].amount };
      } catch (err) {
        debug({ recipeId, interactionNonce }, err);
        throw new Error(`Failed to fetch bridge interaction present value for "${recipeId}".`);
      }
    });
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}
