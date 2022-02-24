import type { EthereumProvider } from '@aztec/sdk';
import type { BlockchainAssetsObs } from 'alt-model/top_level_context/blockchain_assets_obs';
import { createBridgeDataAdaptorCache } from './bridge_data_adaptor_cache';
import { createExpectedYearlyOutputObsCache } from './expected_yearly_output_obs_cache';
import { createMarketSizeObsCache } from './market_size_obs_cache';

export function createBridgeDataAdaptorsMethodCaches(
  ethereumProvider: EthereumProvider,
  blockchainAssetsObs: BlockchainAssetsObs,
) {
  const adaptorsCache = createBridgeDataAdaptorCache(ethereumProvider);
  const expectedYearlyOutputObsCache = createExpectedYearlyOutputObsCache(adaptorsCache, blockchainAssetsObs);
  const marketSizeObsCache = createMarketSizeObsCache(adaptorsCache, blockchainAssetsObs);
  return { expectedYearlyOutputObsCache, marketSizeObsCache };
}

export type BridgeDataAdaptorsMethodCaches = ReturnType<typeof createBridgeDataAdaptorsMethodCaches>;
