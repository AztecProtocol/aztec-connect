import type { AssetValue } from '@aztec/sdk';

function roundUpToSignificantFigures(x: bigint, significantFigures: number) {
  const exponentForTruncation = x.toString(10).length - significantFigures;
  const decimalForTruncation = Number(x) / Math.pow(10, exponentForTruncation);
  return BigInt(Math.ceil(decimalForTruncation)) * 10n ** BigInt(exponentForTruncation);
}

export function normaliseFeeForPrivacy(fee: AssetValue): AssetValue {
  return {
    assetId: fee.assetId,
    value: roundUpToSignificantFigures(fee.value, 2),
  };
}
