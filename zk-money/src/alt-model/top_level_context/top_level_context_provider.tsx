import { JsonRpcProvider } from '@aztec/sdk';
import { createAmountFactoryObs } from 'alt-model/assets/amount_factory_obs';
import { createBridgeDataAdaptorsMethodCaches } from 'alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches';
import { createDefiRecipeObs } from 'alt-model/defi/recipes';
import { createPriceFeedObsCache } from 'alt-model/price_feeds';
import { useMemo } from 'react';
import { Web3Provider } from '@ethersproject/providers';
import { Config } from '../../config';
import { createRemoteAssetsObs } from './remote_assets_obs';
import { createSdkRemoteStatusObs } from './remote_status_obs';
import { createSdkObs } from './sdk_obs';
import { TopLevelContext, TopLevelContextValue } from './top_level_context';

function createTopLevelContextValue(config: Config): TopLevelContextValue {
  const stableEthereumProvider = new JsonRpcProvider(config.ethereumHost);
  const stableWeb3Provider = new Web3Provider(stableEthereumProvider);
  const sdkObs = createSdkObs(stableEthereumProvider, config);
  const remoteStatusObs = createSdkRemoteStatusObs(sdkObs);
  const remoteAssetsObs = createRemoteAssetsObs(remoteStatusObs);
  const amountFactoryObs = createAmountFactoryObs(remoteAssetsObs);
  const priceFeedObsCache = createPriceFeedObsCache(
    stableWeb3Provider,
    config.priceFeedContractAddresses,
    remoteAssetsObs,
  );
  const defiRecipesObs = createDefiRecipeObs(remoteAssetsObs);
  const bridgeDataAdaptorsMethodCaches = createBridgeDataAdaptorsMethodCaches(
    defiRecipesObs,
    stableWeb3Provider,
    remoteAssetsObs,
    config,
  );
  return {
    stableEthereumProvider,
    sdkObs,
    remoteStatusObs,
    remoteAssetsObs,
    amountFactoryObs: amountFactoryObs,
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
