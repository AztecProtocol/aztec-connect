import { JsonRpcProvider } from '@aztec/sdk';
import { createBridgeDataAdaptorsMethodCaches } from 'alt-model/defi/bridge_data_adaptors/caches/bridge_data_adaptors_method_caches';
import { useMemo } from 'react';
import { Config } from '../../config';
import { createBlockchainAssetsObs } from './blockchain_assets_obs';
import { createSdkRemoteStatusObs } from './remote_status_obs';
import { createSdkObs } from './sdk_obs';
import { TopLevelContext, TopLevelContextValue } from './top_level_context';

function createTopLevelContextValue(config: Config): TopLevelContextValue {
  const stableEthereumProvider = new JsonRpcProvider(config.ethereumHost);
  const sdkObs = createSdkObs(stableEthereumProvider, config);
  const remoteStatusObs = createSdkRemoteStatusObs(sdkObs);
  const blockchainAssetsObs = createBlockchainAssetsObs(remoteStatusObs);
  const bridgeDataAdaptorsMethodCaches = createBridgeDataAdaptorsMethodCaches(
    stableEthereumProvider,
    blockchainAssetsObs,
    config,
  );
  return {
    stableEthereumProvider,
    sdkObs,
    remoteStatusObs,
    bridgeDataAdaptorsMethodCaches,
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
