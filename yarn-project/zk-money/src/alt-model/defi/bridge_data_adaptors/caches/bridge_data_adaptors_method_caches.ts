import type { Provider } from '@ethersproject/providers';
import type { Config } from '../../../../config.js';
import type { RollupProviderStatus } from '@aztec/sdk';
import type { DefiRecipe } from '../../../../alt-model/defi/types.js';
import { createAuxDataOptionsPollerCache } from './aux_data_options_poller_cache.js';
import { createBridgeDataAdaptorCache } from './bridge_data_adaptor_cache.js';
import { createExpectedOutputPollerCache } from './expected_output_poller_cache.js';
import { createExpectedAssetYieldPollerCache } from './expected_yield_poller_cache.js';
import { createCurrentAssetYieldPollerCache } from './current_yield_poller_cache.js';

import { createInteractionPresentValuePollerCache } from './interaction_present_value_poller_cache.js';
import { createMarketSizePollerCache } from './market_size_poller_cache.js';
import { createTermAprPollerCache } from './term_apr_poller_cache.js';
import { createUnderlyingAmountPollerCache } from './underlying_amount_poller_cache.js';
import { createUserDebtAndCollateralPollerCache } from './user_debt_and_collateral_poller_cache.js';
import { createCurrentCollateralRatioPollerCache } from './current_collateral_ratio_poller_cache.js';

export function createBridgeDataAdaptorsMethodCaches(
  defiRecipes: DefiRecipe[],
  provider: Provider,
  remoteStatus: RollupProviderStatus,
  config: Config,
) {
  const adaptorsCache = createBridgeDataAdaptorCache(defiRecipes, remoteStatus, provider, config);
  const auxDataPollerCache = createAuxDataOptionsPollerCache(defiRecipes, adaptorsCache);
  const expectedAssetYieldPollerCache = createExpectedAssetYieldPollerCache(defiRecipes, adaptorsCache);
  const termAprPollerCache = createTermAprPollerCache(defiRecipes, adaptorsCache);
  const currentAssetYieldPollerCache = createCurrentAssetYieldPollerCache(defiRecipes, adaptorsCache);
  const expectedOutputPollerCache = createExpectedOutputPollerCache(defiRecipes, adaptorsCache);
  const marketSizePollerCache = createMarketSizePollerCache(defiRecipes, adaptorsCache);
  const interactionPresentValuePollerCache = createInteractionPresentValuePollerCache(adaptorsCache);
  const underlyingAmountPollerCache = createUnderlyingAmountPollerCache(defiRecipes, adaptorsCache);
  const userDebtAndCollateralPollerCache = createUserDebtAndCollateralPollerCache(defiRecipes, adaptorsCache);
  const currentCollateralRatioPollerCache = createCurrentCollateralRatioPollerCache(defiRecipes, adaptorsCache);
  return {
    adaptorsCache,
    auxDataPollerCache,
    expectedAssetYieldPollerCache,
    termAprPollerCache,
    expectedOutputPollerCache,
    marketSizePollerCache,
    currentAssetYieldPollerCache,
    interactionPresentValuePollerCache,
    underlyingAmountPollerCache,
    userDebtAndCollateralPollerCache,
    currentCollateralRatioPollerCache,
  };
}

export type BridgeDataAdaptorsMethodCaches = ReturnType<typeof createBridgeDataAdaptorsMethodCaches>;
