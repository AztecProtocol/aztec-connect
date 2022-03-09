import { AssetValue } from '@aztec/sdk';
import { convertToPrice } from 'app';
import { Obs, useMaybeObs } from 'app/util';
import { mapToObj } from 'app/util/objects';
import { useMemo } from 'react';
import { useRollupProviderStatus } from './rollup_provider_hooks';
import { usePriceFeedObsCache } from './top_level_context';

export function useAssetPrice(assetId?: number) {
  const priceFeedObsCache = usePriceFeedObsCache();
  const obs = assetId !== undefined ? priceFeedObsCache.get(assetId) : undefined;
  return useMaybeObs(obs);
}

export function useAssetPrices(assetIds?: number[]) {
  const priceFeedObsCache = usePriceFeedObsCache();
  const obs = useMemo(() => {
    if (assetIds) {
      const deps = assetIds.map(assetId => priceFeedObsCache.get(assetId));
      return Obs.combine(deps).map(prices => mapToObj(assetIds, (_, idx) => prices[idx]));
    }
  }, [priceFeedObsCache, assetIds]);
  return useMaybeObs(obs);
}

export function useAggregatedAssetsPrice(assetValues?: AssetValue[]) {
  const rpStatus = useRollupProviderStatus();

  const assetIds = useMemo(() => assetValues?.map(x => x.assetId), [assetValues]);
  const prices = useAssetPrices(assetIds);

  if (!assetValues) return undefined;

  let aggregatedPrice = 0n;
  assetValues?.forEach(({ assetId, value }) => {
    const price = prices?.[assetId];
    const asset = rpStatus?.blockchainStatus.assets[assetId];
    if (price !== undefined && asset !== undefined) {
      aggregatedPrice += convertToPrice(value, asset.decimals, price);
    }
  });

  return aggregatedPrice;
}
