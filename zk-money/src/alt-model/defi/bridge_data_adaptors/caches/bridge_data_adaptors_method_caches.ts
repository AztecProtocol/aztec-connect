import type { Provider } from '@ethersproject/providers';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { RemoteStatusObs } from 'alt-model/top_level_context/remote_status_obs';
import type { Config } from 'config';
import { createAuxDataOptionsObsCache } from './aux_data_options_obs_cache';
import { createBridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { createExpectedOutputObsCache } from './expected_output_obs_cache';
import { createExpectedYearlyOutputObsCache } from './expected_yearly_output_obs_cache';
import { createInteractionPresentValueObsCache } from './interaction_present_value_obs_cache';
import { createMarketSizeObsCache } from './market_size_obs_cache';

export function createBridgeDataAdaptorsMethodCaches(
  defiRecipesObs: DefiRecipesObs,
  provider: Provider,
  remoteStatusObs: RemoteStatusObs,
  remoteAssetsObs: RemoteAssetsObs,
  config: Config,
) {
  const adaptorsObsCache = createBridgeDataAdaptorObsCache(defiRecipesObs, remoteStatusObs, provider, config);
  const auxDataObsCache = createAuxDataOptionsObsCache(defiRecipesObs, adaptorsObsCache, remoteAssetsObs);
  const expectedYearlyOutputObsCache = createExpectedYearlyOutputObsCache(
    defiRecipesObs,
    adaptorsObsCache,
    remoteAssetsObs,
  );
  const expectedOutputObsCache = createExpectedOutputObsCache(defiRecipesObs, adaptorsObsCache, remoteAssetsObs);
  const marketSizeObsCache = createMarketSizeObsCache(defiRecipesObs, adaptorsObsCache, remoteAssetsObs);
  const interactionPresentValueObsCache = createInteractionPresentValueObsCache(
    defiRecipesObs,
    adaptorsObsCache,
    remoteAssetsObs,
  );
  return {
    adaptorsObsCache,
    auxDataObsCache,
    expectedYearlyOutputObsCache,
    expectedOutputObsCache,
    marketSizeObsCache,
    interactionPresentValueObsCache,
  };
}

export type BridgeDataAdaptorsMethodCaches = ReturnType<typeof createBridgeDataAdaptorsMethodCaches>;
