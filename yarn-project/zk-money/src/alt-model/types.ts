import type { EthAddress } from '@aztec/sdk';
import type { RegisteredAssetLabel } from './registrations_data/registrations_data_types.js';

export interface RemoteAsset {
  id: number;
  address: EthAddress;
  decimals: number;
  symbol: string;
  name: string;
  label?: RegisteredAssetLabel;
}
