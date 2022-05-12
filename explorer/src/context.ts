import { Network } from './config';
import React, { useContext } from 'react';
import { BlockchainAsset } from '@aztec/sdk';

export const NetworkContext = React.createContext(
  // No default network
  undefined as unknown as Network,
);

export function useAsset(assetId: number) {
  const { blockchainStatus } = useContext(NetworkContext);
  const asset = blockchainStatus.assets[assetId] as BlockchainAsset | undefined;
  return asset;
}
