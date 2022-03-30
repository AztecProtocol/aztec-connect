import { EthAddress } from '@aztec/sdk';
import { mapObj } from 'app/util/objects';

export const KNOWN_MAINNET_ASSET_ADDRESS_STRS = {
  ETH: '0x0000000000000000000000000000000000000000',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  renBTC: '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D',
  wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
} as const;

type KnownAssetAddressKey = keyof typeof KNOWN_MAINNET_ASSET_ADDRESS_STRS;
export type KnownAssetAddressString = typeof KNOWN_MAINNET_ASSET_ADDRESS_STRS[KnownAssetAddressKey];
export type PerKnownAddress<TValue> = Record<KnownAssetAddressString, TValue>;

const addressStrs: string[] = Object.values(KNOWN_MAINNET_ASSET_ADDRESS_STRS);
export function isKnownAssetAddressString(addressStr?: string): addressStr is KnownAssetAddressString {
  if (!addressStr) return false;
  return addressStrs.includes(addressStr);
}

export const KNOWN_MAINNET_ASSET_ADDRESSES = mapObj(KNOWN_MAINNET_ASSET_ADDRESS_STRS, EthAddress.fromString);
