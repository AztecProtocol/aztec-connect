import type { Provider } from '@ethersproject/providers';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import createDebug from 'debug';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { listenPoll } from 'app/util';
import { createAssetPriceFetcher } from './price_fetchers';

const debug = createDebug('zm:price_feed_obs_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createPriceFeedObsCache(web3Provider: Provider, remoteAssetsObs: RemoteAssetsObs) {
  return new LazyInitCacheMap((assetId: number) => {
    return remoteAssetsObs.mapEmitter<bigint | undefined>((assets, emit) => {
      if (assets) {
        const asset = assets.find(x => x.id === assetId);
        if (!asset) {
          debug(`Attempted to start price feed for unfound assetId '${assetId}'`);
          return;
        }
        const fetchPrice = createAssetPriceFetcher(asset.address, web3Provider);
        if (!fetchPrice) return;
        return listenPoll(() => fetchPrice().then(emit), POLL_INTERVAL);
      }
    }, undefined);
  });
}

export type PriceFeedObsCache = ReturnType<typeof createPriceFeedObsCache>;
