import { AssetValue } from '@aztec/sdk';
import { useMemo } from 'react';
import { useAmountFactory, useRemoteAssets } from './top_level_context';

export function useAsset(assetId: number) {
  const assets = useRemoteAssets();
  return assets?.[assetId];
}

export function useAmount(assetValue?: AssetValue) {
  const factory = useAmountFactory();
  return useMemo(() => assetValue && factory?.fromAssetValue(assetValue), [factory, assetValue]);
}

export function useAmounts(assetValues?: AssetValue[]) {
  const factory = useAmountFactory();
  return useMemo(
    () =>
      assetValues?.map(assetValue => {
        return factory?.fromAssetValue(assetValue);
      }),
    [factory, assetValues],
  );
}
