import type { EthereumProvider } from '@aztec/sdk';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { Config } from 'config';
import { createBridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { createExpectedYearlyOutputObsCache } from './expected_yearly_output_obs_cache';
import { createMarketSizeObsCache } from './market_size_obs_cache';

export function createBridgeDataAdaptorsMethodCaches(
  defiRecipesObs: DefiRecipesObs,
  ethereumProvider: EthereumProvider,
  remoteAssetsObs: RemoteAssetsObs,
  config: Config,
) {
  const adaptorsObsCache = createBridgeDataAdaptorObsCache(defiRecipesObs, ethereumProvider, config);
  const expectedYearlyOutputObsCache = createExpectedYearlyOutputObsCache(
    defiRecipesObs,
    adaptorsObsCache,
    remoteAssetsObs,
  );
  const marketSizeObsCache = createMarketSizeObsCache(defiRecipesObs, adaptorsObsCache, remoteAssetsObs);
  return { adaptorsObsCache, expectedYearlyOutputObsCache, marketSizeObsCache };
}

export type BridgeDataAdaptorsMethodCaches = ReturnType<typeof createBridgeDataAdaptorsMethodCaches>;
