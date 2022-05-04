import { EthAddress } from '@aztec/sdk';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from 'alt-model/known_assets/known_asset_addresses';

export const SUPPORTED_FOR_SHIELDING = [KMAA.ETH, KMAA.DAI];

export function assetIsSupportedForShielding(address?: EthAddress) {
  if (!address) return false;
  return SUPPORTED_FOR_SHIELDING.some(addr => addr.equals(address));
}
