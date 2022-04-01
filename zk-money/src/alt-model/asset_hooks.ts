import { AssetValue } from '@aztec/sdk';
import { useMemo } from 'react';
import { useRollupProviderStatus } from './rollup_provider_hooks';
import { useAmountFactory } from './top_level_context';

export function useAssetInfo(assetId: number) {
  const rpStatus = useRollupProviderStatus();
  const assets = rpStatus?.blockchainStatus.assets;
  if (!assets) return 'loading';
  const asset = assets[assetId];
  if (!asset) return 'not-found';
  return asset;
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
