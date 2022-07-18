import type { Provider } from '@ethersproject/providers';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { Poller } from 'app/util/poller';
import { createAssetPriceFetcher } from './price_fetchers';
import { Obs } from 'app/util';

const POLL_INTERVAL = 5 * 60 * 1000;

export function createPriceFeedPollerCache(web3Provider: Provider) {
  return new LazyInitCacheMap((assetAddress: string) => {
    const pollObs = Obs.constant(createAssetPriceFetcher(assetAddress, web3Provider));
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}

export type PriceFeedPollerCache = ReturnType<typeof createPriceFeedPollerCache>;
