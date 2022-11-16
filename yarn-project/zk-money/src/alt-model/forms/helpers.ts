import { Amount } from '../assets/index.js';
import { getAssetPreferredFractionalDigits } from '../known_assets/known_asset_display_data.js';
import { RemoteAsset } from '../types.js';
import { StrOrMax, MAX_MODE } from './constants.js';

export function roundDownToPreferedFractionalDigits(value: bigint, asset: RemoteAsset) {
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

export function hasIssues<T extends { issues: Record<string, boolean> }>(item: T | undefined) {
  // undefined implies still loading
  if (!item) return true;
  return Object.values(item.issues).some(x => x);
}
