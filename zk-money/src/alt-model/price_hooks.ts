import { AssetValue } from '@aztec/sdk';
import { convertToBulkPrice } from 'app';
import { Obs, useMaybeObs } from 'app/util';
import { mapToObj } from 'app/util/objects';
import { useMemo } from 'react';
import { Amount } from './assets';
import { useRollupProviderStatus } from './rollup_provider_hooks';
import { usePriceFeedObsCache } from './top_level_context';

export function useAssetUnitPrice(assetId?: number) {
  const priceFeedObsCache = usePriceFeedObsCache();
  const obs = assetId !== undefined ? priceFeedObsCache.get(assetId) : undefined;
  return useMaybeObs(obs);
}

export function useAssetUnitPrices(assetIds?: number[]) {
  const priceFeedObsCache = usePriceFeedObsCache();
  const obs = useMemo(() => {
    if (assetIds) {
      const deps = assetIds.map(assetId => priceFeedObsCache.get(assetId));
      return Obs.combine(deps).map(prices => mapToObj(assetIds, (_, idx) => prices[idx]));
    }
  }, [priceFeedObsCache, assetIds]);
  return useMaybeObs(obs);
}

export function useAggregatedAssetsBulkPrice(assetValues?: AssetValue[]) {
  const rpStatus = useRollupProviderStatus();

  const assetIds = useMemo(() => assetValues?.map(x => x.assetId), [assetValues]);
  const unitPrices = useAssetUnitPrices(assetIds);

  if (!assetValues) return undefined;

  let aggregatedBulkPrice = 0n;
  assetValues?.forEach(({ assetId, value }) => {
    const unitPrice = unitPrices?.[assetId];
    const asset = rpStatus?.blockchainStatus.assets[assetId];
    if (unitPrice !== undefined && asset !== undefined) {
      aggregatedBulkPrice += convertToBulkPrice(value, asset.decimals, unitPrice);
    }
  });

  return aggregatedBulkPrice;
}

export function useAmountBulkPrice(amount?: Amount) {
  const unitPrice = useAssetUnitPrice(amount?.id);
  if (unitPrice === undefined || amount === undefined) return;
  return convertToBulkPrice(amount.baseUnits, amount.info.decimals, unitPrice);
}
