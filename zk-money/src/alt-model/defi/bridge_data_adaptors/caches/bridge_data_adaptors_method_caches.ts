import type { Provider } from '@ethersproject/providers';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { RemoteStatusObs } from 'alt-model/top_level_context/remote_status_obs';
import { createAuxDataOptionsObsCache } from './aux_data_options_obs_cache';
import { createBridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { createExpectedYearlyOutputObsCache } from './expected_yearly_output_obs_cache';
import { createMarketSizeObsCache } from './market_size_obs_cache';

export function createBridgeDataAdaptorsMethodCaches(
  defiRecipesObs: DefiRecipesObs,
  provider: Provider,
  remoteStatusObs: RemoteStatusObs,
  remoteAssetsObs: RemoteAssetsObs,
) {
  const adaptorsObsCache = createBridgeDataAdaptorObsCache(defiRecipesObs, remoteStatusObs, provider);
  const auxDataObsCache = createAuxDataOptionsObsCache(defiRecipesObs, adaptorsObsCache, remoteAssetsObs);
  const expectedYearlyOutputObsCache = createExpectedYearlyOutputObsCache(
    defiRecipesObs,
    adaptorsObsCache,
    remoteAssetsObs,
  );
  const marketSizeObsCache = createMarketSizeObsCache(defiRecipesObs, adaptorsObsCache, remoteAssetsObs);
  return { adaptorsObsCache, auxDataObsCache, expectedYearlyOutputObsCache, marketSizeObsCache };
}

export type BridgeDataAdaptorsMethodCaches = ReturnType<typeof createBridgeDataAdaptorsMethodCaches>;
