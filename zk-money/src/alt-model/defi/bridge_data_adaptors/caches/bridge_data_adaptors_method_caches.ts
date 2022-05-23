import type { Provider } from '@ethersproject/providers';
import type { Config } from 'config';
import type { RollupProviderStatus } from '@aztec/sdk';
import type { DefiRecipe } from 'alt-model/defi/types';
import { createAuxDataOptionsPollerCache } from './aux_data_options_poller_cache';
import { createBridgeDataAdaptorCache } from './bridge_data_adaptor_cache';
import { createExpectedOutputPollerCache } from './expected_output_poller_cache';
import { createExpectedAssetYieldPollerCache } from './expected_yield_poller_cache';
import { createCurrentAssetYieldPollerCache } from './current_yield_poller_cache';

import { createInteractionPresentValuePollerCache } from './interaction_present_value_poller_cache';
import { createMarketSizePollerCache } from './market_size_poller_cache';

export function createBridgeDataAdaptorsMethodCaches(
  defiRecipes: DefiRecipe[],
  provider: Provider,
  remoteStatus: RollupProviderStatus,
  config: Config,
) {
  const adaptorsCache = createBridgeDataAdaptorCache(defiRecipes, remoteStatus, provider, config);
  const auxDataPollerCache = createAuxDataOptionsPollerCache(defiRecipes, adaptorsCache);
  const expectedAssetYieldPollerCache = createExpectedAssetYieldPollerCache(defiRecipes, adaptorsCache);
  const currentAssetYieldPollerCache = createCurrentAssetYieldPollerCache(defiRecipes, adaptorsCache);
  const expectedOutputPollerCache = createExpectedOutputPollerCache(defiRecipes, adaptorsCache);
  const marketSizePollerCache = createMarketSizePollerCache(defiRecipes, adaptorsCache);
  const interactionPresentValuePollerCache = createInteractionPresentValuePollerCache(adaptorsCache);
  return {
    adaptorsCache,
    auxDataPollerCache,
    expectedAssetYieldPollerCache,
    expectedOutputPollerCache,
    marketSizePollerCache,
    currentAssetYieldPollerCache,
    interactionPresentValuePollerCache,
  };
}

export type BridgeDataAdaptorsMethodCaches = ReturnType<typeof createBridgeDataAdaptorsMethodCaches>;
