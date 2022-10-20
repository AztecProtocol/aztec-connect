import type { EthAddress } from '@aztec/sdk';

export interface CutdownAsset {
  id: number;
  decimals: number;
  address: EthAddress;
  symbol: string;
}
