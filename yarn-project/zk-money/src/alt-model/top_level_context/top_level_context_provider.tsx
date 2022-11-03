import { createBridgeDataAdaptorsMethodCaches } from '../../alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches.js';
import { createDefiRecipes } from '../../alt-model/defi/recipes.js';
import { createPriceFeedObsCache } from '../../alt-model/price_feeds/index.js';
import { useMemo } from 'react';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Config } from '../../config.js';
import { createRemoteAssetsObs } from './remote_assets_obs.js';
import { createSdkRemoteStatusPoller } from './remote_status_poller.js';
import { createSdkObs } from './sdk_obs.js';
import { TopLevelContext, TopLevelContextValue } from './top_level_context.js';
import { createGasPricePoller } from '../gas/gas_price_obs.js';
import { AmountFactory } from '../assets/amount_factory.js';
import { RollupProviderStatus } from '@aztec/sdk';
import { ToastsObs } from './toasts_obs.js';
import { createChainLinkPollerCache } from '../../alt-model/price_feeds/chain_link_poller_cache.js';

function createTopLevelContextValue(
  config: Config,
  initialRollupProviderStatus: RollupProviderStatus,
): TopLevelContextValue {
  const stableEthereumProvider = new JsonRpcProvider(config.ethereumHost);
  const sdkObs = createSdkObs(config);
  const toastsObs = new ToastsObs();
  const remoteStatusPoller = createSdkRemoteStatusPoller(sdkObs, initialRollupProviderStatus);
  const remoteStatusObs = remoteStatusPoller.obs;
  const remoteAssetsObs = createRemoteAssetsObs(remoteStatusObs);

  // Many remote status fields will never change, so we use initialRollupProviderStatus and initialRemoteAssets as
  // dependencies for entities that only need the unchanging fields, to reducing unnecessary reconstructions/rerenders.
  const initialRemoteAssets = remoteAssetsObs.value;

  const amountFactory = new AmountFactory(initialRemoteAssets);
  const gasPricePoller = createGasPricePoller(stableEthereumProvider);
  const defiRecipes = createDefiRecipes(initialRollupProviderStatus, initialRemoteAssets);
  const bridgeDataAdaptorsMethodCaches = createBridgeDataAdaptorsMethodCaches(
    defiRecipes,
    stableEthereumProvider,
    initialRollupProviderStatus,
    config,
  );
  const chainLinkPollerCache = createChainLinkPollerCache(stableEthereumProvider);
  const priceFeedObsCache = createPriceFeedObsCache(
    stableEthereumProvider,
    chainLinkPollerCache,
    bridgeDataAdaptorsMethodCaches.underlyingAmountPollerCache,
  );

  return {
    config,
    stableEthereumProvider,
    sdkObs,
    toastsObs,
    remoteStatusPoller,
    remoteAssetsObs,
    amountFactory,
    chainLinkPollerCache,
    priceFeedObsCache,
    gasPricePoller,
    bridgeDataAdaptorsMethodCaches,
    defiRecipes,
  };
}

interface TopLevelContextProviderProps {
  children: React.ReactNode;
  config: Config;
  initialRollupProviderStatus: RollupProviderStatus;
}

export function TopLevelContextProvider({
  config,
  initialRollupProviderStatus,
  children,
}: TopLevelContextProviderProps) {
  const value = useMemo(
    () => createTopLevelContextValue(config, initialRollupProviderStatus),
    [config, initialRollupProviderStatus],
  );
  return <TopLevelContext.Provider value={value}>{children}</TopLevelContext.Provider>;
}
