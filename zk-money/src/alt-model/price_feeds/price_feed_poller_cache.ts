import type { Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { Poller } from 'app/util/poller';
import { createAssetPriceFetcher } from './price_fetchers';
import { Obs } from 'app/util';
import { RemoteAsset } from 'alt-model/types';

const debug = createDebug('zm:price_feed_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

export function createPriceFeedPollerCache(web3Provider: Provider, assets: RemoteAsset[]) {
  return new LazyInitCacheMap((assetId: number) => {
    const asset = assets.find(x => x.id === assetId);
    if (!asset) {
      debug(`Attempted to start price feed for unfound assetId '${assetId}'`);
      return undefined;
    }
    const pollObs = Obs.constant(createAssetPriceFetcher(asset.address, web3Provider));
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}

export type PriceFeedPollerCache = ReturnType<typeof createPriceFeedPollerCache>;
