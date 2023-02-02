import { Network } from './config.js';
import React, { useContext } from 'react';
import { BlockchainAsset } from '@aztec/sdk';
import { ServerRollupProvider } from '@aztec/sdk';

export const NetworkContext = React.createContext(
  // No default network
  undefined as unknown as Network,
);

export const RollupProviderContext = React.createContext(
  // No default provider
  undefined as unknown as ServerRollupProvider,
);

export function useAsset(assetId: number) {
  const { blockchainStatus } = useContext(NetworkContext);
  const asset = blockchainStatus.assets[assetId] as BlockchainAsset | undefined;
  return asset;
}
