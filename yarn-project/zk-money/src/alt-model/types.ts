import type { BlockchainAsset } from '@aztec/sdk';

export interface RemoteAsset extends BlockchainAsset {
  id: number;
}
