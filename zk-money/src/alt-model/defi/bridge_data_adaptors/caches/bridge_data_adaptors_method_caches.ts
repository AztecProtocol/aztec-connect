import type { Provider } from '@ethersproject/providers';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import type { RemoteStatusObs } from 'alt-model/top_level_context/remote_status_poller';
import type { Config } from 'config';
import { createAuxDataOptionsPollerCache } from './aux_data_options_poller_cache';
import { createBridgeDataAdaptorObsCache } from './bridge_data_adaptor_cache';
import { createExpectedOutputPollerCache } from './expected_output_poller_cache';
import { createExpectedYearlyOutputPollerCache } from './expected_yearly_output_poller_cache';
import { createInteractionPresentValuePollerCache } from './interaction_present_value_poller_cache';
import { createMarketSizePollerCache } from './market_size_poller_cache';

export function createBridgeDataAdaptorsMethodCaches(
  defiRecipesObs: DefiRecipesObs,
  provider: Provider,
  remoteStatusObs: RemoteStatusObs,
  remoteAssetsObs: RemoteAssetsObs,
  config: Config,
) {
  const adaptorsObsCache = createBridgeDataAdaptorObsCache(defiRecipesObs, remoteStatusObs, provider, config);
  const auxDataPollerCache = createAuxDataOptionsPollerCache(defiRecipesObs, adaptorsObsCache, remoteAssetsObs);
  const expectedYearlyOutputPollerCache = createExpectedYearlyOutputPollerCache(
    defiRecipesObs,
    adaptorsObsCache,
    remoteAssetsObs,
  );
  const expectedOutputPollerCache = createExpectedOutputPollerCache(defiRecipesObs, adaptorsObsCache, remoteAssetsObs);
  const marketSizePollerCache = createMarketSizePollerCache(defiRecipesObs, adaptorsObsCache, remoteAssetsObs);
  const interactionPresentValuePollerCache = createInteractionPresentValuePollerCache(
    adaptorsObsCache,
    remoteAssetsObs,
  );
  return {
    adaptorsObsCache,
    auxDataPollerCache,
    expectedYearlyOutputPollerCache,
    expectedOutputPollerCache,
    marketSizePollerCache,
    interactionPresentValuePollerCache,
  };
}

export type BridgeDataAdaptorsMethodCaches = ReturnType<typeof createBridgeDataAdaptorsMethodCaches>;
