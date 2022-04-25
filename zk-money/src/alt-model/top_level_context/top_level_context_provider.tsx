import { createAmountFactoryObs } from 'alt-model/assets/amount_factory_obs';
import { createBridgeDataAdaptorsMethodCaches } from 'alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches';
import { createDefiRecipeObs } from 'alt-model/defi/recipes';
import { createPriceFeedObsCache } from 'alt-model/price_feeds';
import { useMemo } from 'react';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Config } from '../../config';
import { createRemoteAssetsObs } from './remote_assets_obs';
import { createSdkRemoteStatusObs } from './remote_status_obs';
import { createSdkObs } from './sdk_obs';
import { TopLevelContext, TopLevelContextValue } from './top_level_context';
import { createGasPriceObs } from 'alt-model/gas/gas_price_obs';

function createTopLevelContextValue(config: Config): TopLevelContextValue {
  const stableEthereumProvider = new JsonRpcProvider(config.ethereumHost);
  const sdkObs = createSdkObs(config);
  const remoteStatusObs = createSdkRemoteStatusObs(sdkObs);
  const remoteAssetsObs = createRemoteAssetsObs(remoteStatusObs);

  // Many remote status fields will never change, so we use firstRemoteStatusObs and firstRemoteAssetsObs as a
  // dependency for entities that only need the unchanging fields, to reducing unnecessary reconstructions/rerenders.
  const firstRemoteStatusObs = remoteStatusObs.filter((_, preValue) => !preValue);
  const firstRemoteAssetsObs = createRemoteAssetsObs(firstRemoteStatusObs);

  const amountFactoryObs = createAmountFactoryObs(firstRemoteAssetsObs);
  const gasPriceObs = createGasPriceObs(stableEthereumProvider);
  const priceFeedObsCache = createPriceFeedObsCache(stableEthereumProvider, firstRemoteAssetsObs);
  const defiRecipesObs = createDefiRecipeObs(firstRemoteStatusObs, firstRemoteAssetsObs);
  const bridgeDataAdaptorsMethodCaches = createBridgeDataAdaptorsMethodCaches(
    defiRecipesObs,
    stableEthereumProvider,
    firstRemoteStatusObs,
    firstRemoteAssetsObs,
    config,
  );
  return {
    config,
    stableEthereumProvider,
    sdkObs,
    remoteStatusObs,
    remoteAssetsObs,
    amountFactoryObs,
    priceFeedObsCache,
    gasPriceObs,
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
