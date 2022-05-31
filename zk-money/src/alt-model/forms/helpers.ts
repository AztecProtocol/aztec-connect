import { Amount } from 'alt-model/assets';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { RemoteAsset } from 'alt-model/types';
import { StrOrMax, MAX_MODE } from './constants';

function roundDownToPreferedFractionalDigits(value: bigint, asset: RemoteAsset) {
  const digitsToTruncate = asset.decimals - (getAssetPreferredFractionalDigits(asset.address) ?? 0);
  const domainToTruncate = 10n ** BigInt(digitsToTruncate);
  return (value / domainToTruncate) * domainToTruncate;
}

export function amountFromStrOrMaxRoundedDown(amountStrOrMax: StrOrMax, maxL2Output: bigint, asset: RemoteAsset) {
  if (amountStrOrMax === MAX_MODE) {
    const roundedDown = roundDownToPreferedFractionalDigits(maxL2Output, asset);
    return new Amount(roundedDown, asset);
  }
  return Amount.from(amountStrOrMax, asset);
}

export function getPrecisionIsTooHigh(amount: Amount) {
  const digits = getAssetPreferredFractionalDigits(amount.info.address);
  if (digits === undefined) return false;
  const truncation = 10n ** BigInt(amount.info.decimals - digits);
  const truncationHasImpact = (amount.baseUnits / truncation) * truncation !== amount.baseUnits;
  return truncationHasImpact;
}
