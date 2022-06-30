import { AssetValue } from '@aztec/sdk';
import { convertToBulkPrice } from 'app';
import { Obs, useMaybeObs } from 'app/util';
import { mapToObj } from 'app/util/objects';
import { useMemo } from 'react';
import { Amount } from './assets';
import { useRollupProviderStatus } from './rollup_provider_hooks';
import { usePriceFeedPollerCache } from './top_level_context';

export function useAssetUnitPrice(assetId?: number) {
  const priceFeedPollerCache = usePriceFeedPollerCache();
  const poller = assetId !== undefined ? priceFeedPollerCache.get(assetId) : undefined;
  return useMaybeObs(poller?.obs);
}

export function useAssetUnitPrices(assetIds?: number[]) {
  const priceFeedPollerCache = usePriceFeedPollerCache();
  const obs = useMemo(() => {
    if (assetIds) {
      const deps = assetIds.map(assetId => priceFeedPollerCache.get(assetId)?.obs ?? Obs.constant(undefined));
      return Obs.combine(deps).map(prices => mapToObj(assetIds, (_, idx) => prices[idx]));
    }
  }, [priceFeedPollerCache, assetIds]);
  return useMaybeObs(obs);
}

export function useAggregatedAssetsBulkPrice(assetValues?: AssetValue[]): {
  bulkPrice: bigint;
  loading: boolean;
  firstPriceReady: boolean;
} {
  const rpStatus = useRollupProviderStatus();

  const assetIds = useMemo(() => assetValues?.map(x => x.assetId), [assetValues]);
  const unitPrices = useAssetUnitPrices(assetIds);

  if (!assetValues) return { bulkPrice: 0n, loading: true, firstPriceReady: false };
  if (assetValues.length === 0) return { bulkPrice: 0n, loading: false, firstPriceReady: true };

  let aggregatedBulkPrice = 0n;
  let loadingPricesCount = 0;
  let pricesCount = 0;
  assetValues?.forEach(({ assetId, value }) => {
    pricesCount++;
    const unitPrice = unitPrices?.[assetId];
    const asset = rpStatus.blockchainStatus.assets[assetId];
    if (unitPrice !== undefined) {
      aggregatedBulkPrice += convertToBulkPrice(value, asset.decimals, unitPrice);
    } else {
      loadingPricesCount++;
    }
  });

  return {
    bulkPrice: aggregatedBulkPrice,
    loading: loadingPricesCount > 0,
    firstPriceReady: loadingPricesCount < pricesCount,
  };
}

export function useAmountBulkPrice(amount?: Amount) {
  const unitPrice = useAssetUnitPrice(amount?.id);
  if (unitPrice === undefined || amount === undefined) return;
  return convertToBulkPrice(amount.baseUnits, amount.info.decimals, unitPrice);
}
