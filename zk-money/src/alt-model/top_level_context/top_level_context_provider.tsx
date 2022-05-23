import { createBridgeDataAdaptorsMethodCaches } from 'alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches';
import { createDefiRecipes } from 'alt-model/defi/recipes';
import { createPriceFeedPollerCache } from 'alt-model/price_feeds';
import { useMemo } from 'react';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Config } from '../../config';
import { createRemoteAssetsObs } from './remote_assets_obs';
import { createSdkRemoteStatusPoller } from './remote_status_poller';
import { createSdkObs } from './sdk_obs';
import { TopLevelContext, TopLevelContextValue } from './top_level_context';
import { createGasPricePoller } from 'alt-model/gas/gas_price_obs';
import { AmountFactory } from 'alt-model/assets/amount_factory';
import { RollupProviderStatus } from '@aztec/sdk';

function createTopLevelContextValue(
  config: Config,
  initialRollupProviderStatus: RollupProviderStatus,
): TopLevelContextValue {
  const stableEthereumProvider = new JsonRpcProvider(config.ethereumHost);
  const sdkObs = createSdkObs(config);
  const remoteStatusPoller = createSdkRemoteStatusPoller(sdkObs, initialRollupProviderStatus);
  const remoteStatusObs = remoteStatusPoller.obs;
  const remoteAssetsObs = createRemoteAssetsObs(remoteStatusObs);

  // Many remote status fields will never change, so we use initialRollupProviderStatus and initialRemoteAssets as
  // dependencies for entities that only need the unchanging fields, to reducing unnecessary reconstructions/rerenders.
  const initialRemoteAssets = remoteAssetsObs.value;

  const amountFactory = new AmountFactory(initialRemoteAssets);
  const gasPricePoller = createGasPricePoller(stableEthereumProvider);
  const priceFeedPollerCache = createPriceFeedPollerCache(stableEthereumProvider, initialRemoteAssets);
  const defiRecipes = createDefiRecipes(initialRollupProviderStatus, initialRemoteAssets);
  const bridgeDataAdaptorsMethodCaches = createBridgeDataAdaptorsMethodCaches(
    defiRecipes,
    stableEthereumProvider,
    initialRollupProviderStatus,
    config,
  );
  return {
    config,
    stableEthereumProvider,
    sdkObs,
    remoteStatusPoller,
    remoteAssetsObs,
    amountFactory,
    priceFeedPollerCache,
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
