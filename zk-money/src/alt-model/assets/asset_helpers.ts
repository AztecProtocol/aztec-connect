import type { AssetValue } from '@aztec/sdk';
import type { RemoteAsset } from 'alt-model/types';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';

export function getIsDust(assetValue: AssetValue, asset: RemoteAsset) {
  const fractionalDigits = getAssetPreferredFractionalDigits(asset.address);
  if (fractionalDigits === undefined) return false;
  const dustThreshold = 10n ** BigInt(asset.decimals - fractionalDigits);
  return assetValue.value <= dustThreshold;
}
