import type { Provider } from '@ethersproject/providers';
import { LazyInitCacheMap } from 'app/util/lazy_init_cache_map';
import { createAssetPriceObs } from './price_fetchers';
import { UnderlyingAmountPollerCache } from 'alt-model/defi/bridge_data_adaptors/caches/underlying_amount_poller_cache';
import { ChainLinkPollerCache } from './chain_link_poller_cache';

export function createPriceFeedObsCache(
  web3Provider: Provider,
  chainLinkPollerCache: ChainLinkPollerCache,
  underlyingAmountPollerCache: UnderlyingAmountPollerCache,
) {
  return new LazyInitCacheMap((assetAddress: string) =>
    createAssetPriceObs(assetAddress, web3Provider, chainLinkPollerCache, underlyingAmountPollerCache),
  );
}

export type PriceFeedObsCache = ReturnType<typeof createPriceFeedObsCache>;
