import type { EthereumProvider } from '@aztec/sdk';
import type { BridgeDataAdaptorsMethodCaches } from 'alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches';
import type { RemoteStatusObs } from './remote_status_obs';
import type { SdkObs } from './sdk_obs';
import type { DefiRecipesObs } from 'alt-model/defi/recipes';
import type { RemoteAssetsObs } from './remote_assets_obs';
import type { PriceFeedObsCache } from 'alt-model/price_feeds';
import { createContext, useContext } from 'react';

export interface TopLevelContextValue {
  stableEthereumProvider: EthereumProvider;
  sdkObs: SdkObs;
  remoteStatusObs: RemoteStatusObs;
  remoteAssetsObs: RemoteAssetsObs;
  priceFeedObsCache: PriceFeedObsCache;
  bridgeDataAdaptorsMethodCaches: BridgeDataAdaptorsMethodCaches;
  defiRecipesObs: DefiRecipesObs;
}

export const TopLevelContext = createContext(
  // No default value
  undefined as unknown as TopLevelContextValue,
);

export function useStableEthereumProvider() {
  return useContext(TopLevelContext).stableEthereumProvider;
}
