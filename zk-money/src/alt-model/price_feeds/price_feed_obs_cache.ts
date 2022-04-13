import type { Provider } from '@ethersproject/providers';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import createDebug from 'debug';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { createMemo, Poller } from 'app/util';
import { createAssetPriceFetcher } from './price_fetchers';

const debug = createDebug('zm:price_feed_obs_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createPriceFeedObsCache(web3Provider: Provider, remoteAssetsObs: RemoteAssetsObs) {
  return new LazyInitCacheMap((assetId: number) => {
    // The poller is memoed outside the emitter function so that its last polled time is preserved
    // beyond emitter cleanup.
    const memo = createMemo<Poller | undefined>();
    return remoteAssetsObs.mapEmitter<bigint | undefined>((assets, emit) => {
      const poller = memo(() => {
        if (assets) {
          const asset = assets.find(x => x.id === assetId);
          if (!asset) {
            debug(`Attempted to start price feed for unfound assetId '${assetId}'`);
            return;
          }
          const fetchPrice = createAssetPriceFetcher(asset.address, web3Provider);
          if (!fetchPrice) return;
          return new Poller(() => fetchPrice().then(emit), POLL_INTERVAL);
        }
      }, [assets]);
      return poller?.activate();
    }, undefined);
  });
}

export type PriceFeedObsCache = ReturnType<typeof createPriceFeedObsCache>;
