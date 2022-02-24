import type { EthereumProvider } from '@aztec/sdk';
import type { BlockchainAssetsObs } from 'alt-model/top_level_context/blockchain_assets_obs';
import type { Config } from 'config';
import { createBridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { createExpectedYearlyOutputObsCache } from './expected_yearly_output_obs_cache';
import { createMarketSizeObsCache } from './market_size_obs_cache';

export function createBridgeDataAdaptorsMethodCaches(
  ethereumProvider: EthereumProvider,
  blockchainAssetsObs: BlockchainAssetsObs,
  config: Config,
) {
  const adaptorsObsCache = createBridgeDataAdaptorObsCache(ethereumProvider, config);
  const expectedYearlyOutputObsCache = createExpectedYearlyOutputObsCache(adaptorsObsCache, blockchainAssetsObs);
  const marketSizeObsCache = createMarketSizeObsCache(adaptorsObsCache, blockchainAssetsObs);
  return { adaptorsObsCache, expectedYearlyOutputObsCache, marketSizeObsCache };
}

export type BridgeDataAdaptorsMethodCaches = ReturnType<typeof createBridgeDataAdaptorsMethodCaches>;
