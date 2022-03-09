import { JsonRpcProvider } from '@aztec/sdk';
import { createBridgeDataAdaptorsMethodCaches } from 'alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches';
import { createDefiRecipeObs } from 'alt-model/defi/recipes';
import { createPriceFeedObsCache } from 'alt-model/price_feeds';
import { useMemo } from 'react';
import { Config } from '../../config';
import { createRemoteAssetsObs } from './remote_assets_obs';
import { createSdkRemoteStatusObs } from './remote_status_obs';
import { createSdkObs } from './sdk_obs';
import { TopLevelContext, TopLevelContextValue } from './top_level_context';

function createTopLevelContextValue(config: Config): TopLevelContextValue {
  const stableEthereumProvider = new JsonRpcProvider(config.ethereumHost);
  const sdkObs = createSdkObs(stableEthereumProvider, config);
  const remoteStatusObs = createSdkRemoteStatusObs(sdkObs);
  const remoteAssetsObs = createRemoteAssetsObs(remoteStatusObs);
  const priceFeedObsCache = createPriceFeedObsCache(
    stableEthereumProvider,
    config.priceFeedContractAddresses,
    remoteAssetsObs,
  );
  const defiRecipesObs = createDefiRecipeObs(remoteAssetsObs);
  const bridgeDataAdaptorsMethodCaches = createBridgeDataAdaptorsMethodCaches(
    defiRecipesObs,
    stableEthereumProvider,
    remoteAssetsObs,
    config,
  );
  return {
    stableEthereumProvider,
    sdkObs,
    remoteStatusObs,
    remoteAssetsObs,
    priceFeedObsCache,
    bridgeDataAdaptorsMethodCaches,
    defiRecipesObs,
  };
}

interface TopLevelContextProviderProps {
  children: React.ReactNode;
  config: Config;
}

export function TopLevelContextProvider({ config, children }: TopLevelContextProviderProps) {
  const value = useMemo(() => createTopLevelContextValue(config), [config]);
  return <TopLevelContext.Provider value={value}>{children}</TopLevelContext.Provider>;
}
