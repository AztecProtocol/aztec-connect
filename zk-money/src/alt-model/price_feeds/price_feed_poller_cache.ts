import type { Provider } from '@ethersproject/providers';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import createDebug from 'debug';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { Poller } from 'app/util/poller';
import { createAssetPriceFetcher } from './price_fetchers';

const debug = createDebug('zm:price_feed_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createPriceFeedPollerCache(web3Provider: Provider, remoteAssetsObs: RemoteAssetsObs) {
  return new LazyInitCacheMap((assetId: number) => {
    const pollObs = remoteAssetsObs.map(assets => {
      if (!assets) return undefined;
      const asset = assets.find(x => x.id === assetId);
      if (!asset) {
        debug(`Attempted to start price feed for unfound assetId '${assetId}'`);
        return undefined;
      }
      return createAssetPriceFetcher(asset.address, web3Provider);
    });
    return new Poller(pollObs, POLL_INTERVAL);
  });
}

export type PriceFeedPollerCache = ReturnType<typeof createPriceFeedPollerCache>;
