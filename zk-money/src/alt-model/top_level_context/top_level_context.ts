import type { EthereumProvider } from '@aztec/sdk';
import type { BridgeDataAdaptorsMethodCaches } from 'alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches';
import type { RemoteStatusObs } from './remote_status_obs';
import type { SdkObs } from './sdk_obs';
import { createContext, useContext } from 'react';

export interface TopLevelContextValue {
  stableEthereumProvider: EthereumProvider;
  sdkObs: SdkObs;
  remoteStatusObs: RemoteStatusObs;
  bridgeDataAdaptorsMethodCaches: BridgeDataAdaptorsMethodCaches;
}

export const TopLevelContext = createContext(
  // No default value
  undefined as unknown as TopLevelContextValue,
);

export function useStableEthereumProvider() {
  return useContext(TopLevelContext).stableEthereumProvider;
}
