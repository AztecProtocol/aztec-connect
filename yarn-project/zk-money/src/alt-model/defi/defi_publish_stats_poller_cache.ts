import { LazyInitDeepCacheMap } from '../../app/util/lazy_init_cache_map.js';
import { Poller } from '../../app/util/poller.js';
import { SdkObs } from '../top_level_context/sdk_obs.js';
import { DefiPublishStatsCacheArgs } from './types.js';

const POLL_INTERVAL = 1000 * 60 * 60;

export function createDefiPublishStatsPollerCache(sdkObs: SdkObs) {
  return new LazyInitDeepCacheMap(
    ([
      bridgeAddressId,
      inputAssetIdA,
      inputAssetIdB,
      outputAssetIdA,
      outputAssetIdB,
      auxData,
    ]: DefiPublishStatsCacheArgs) => {
      const pollObs = sdkObs.map(sdk => {
        if (!sdk) return undefined;
        return () =>
          sdk.queryDefiPublishStats({
            bridgeAddressId,
            inputAssetIdA,
            inputAssetIdB,
            outputAssetIdA,
            outputAssetIdB,
            auxData,
          });
      });
      return new Poller(pollObs, POLL_INTERVAL, undefined);
    },
  );
}

export type DefiPulishStatsPollerCache = ReturnType<typeof createDefiPublishStatsPollerCache>;
