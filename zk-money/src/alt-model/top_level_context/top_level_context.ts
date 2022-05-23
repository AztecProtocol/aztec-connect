import type { Config } from 'config';
import type { Provider } from '@ethersproject/providers';
import type { BridgeDataAdaptorsMethodCaches } from 'alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches';
import type { RemoteStatusPoller } from './remote_status_poller';
import type { SdkObs } from './sdk_obs';
import type { DefiRecipe } from 'alt-model/defi/types';
import type { RemoteAssetsObs } from './remote_assets_obs';
import type { AmountFactory } from 'alt-model/assets/amount_factory';
import type { PriceFeedPollerCache } from 'alt-model/price_feeds';
import type { GasPricePoller } from 'alt-model/gas/gas_price_obs';
import { createContext, useContext } from 'react';

export interface TopLevelContextValue {
  config: Config;
  stableEthereumProvider: Provider;
  sdkObs: SdkObs;
  remoteStatusPoller: RemoteStatusPoller;
  remoteAssetsObs: RemoteAssetsObs;
  amountFactory: AmountFactory;
  priceFeedPollerCache: PriceFeedPollerCache;
  gasPricePoller: GasPricePoller;
  bridgeDataAdaptorsMethodCaches: BridgeDataAdaptorsMethodCaches;
  defiRecipes: DefiRecipe[];
}

export const TopLevelContext = createContext(
  // No default value
  undefined as unknown as TopLevelContextValue,
);

export function useStableEthereumProvider() {
  return useContext(TopLevelContext).stableEthereumProvider;
}
