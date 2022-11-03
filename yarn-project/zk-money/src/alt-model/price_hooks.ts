import { AssetValue } from '@aztec/sdk';
import { convertToBulkPrice } from '../app/index.js';
import { Obs, useMaybeObs } from '../app/util/index.js';
import { mapToObj } from '../app/util/objects.js';
import { useMemo } from 'react';
import { Amount } from './assets/index.js';
import { useRollupProviderStatus } from './rollup_provider_hooks.js';
import { usePriceFeedObsCache, useRemoteAssets } from './top_level_context/index.js';

export function useAssetUnitPrice(assetId?: number) {
  const priceFeedObsCache = usePriceFeedObsCache();
  const assets = useRemoteAssets();
  const obs = assetId !== undefined ? priceFeedObsCache.get(assets[assetId].address.toString()) : undefined;
  return useMaybeObs(obs);
}

export function useAssetUnitPriceFromAddress(assetAddress?: string) {
  const priceFeedObsCache = usePriceFeedObsCache();
  const obs = assetAddress !== undefined ? priceFeedObsCache.get(assetAddress) : undefined;
  return useMaybeObs(obs);
}

export function useAssetUnitPrices(assetIds?: number[]) {
  const priceFeedPollerCache = usePriceFeedObsCache();
  const assets = useRemoteAssets();
  const obs = useMemo(() => {
    if (assetIds) {
      const deps = assetIds.map(
        assetId => priceFeedPollerCache.get(assets[assetId].address.toString()) ?? Obs.constant(undefined),
      );
      return Obs.combine(deps).map(prices => mapToObj(assetIds, (_, idx) => prices[idx]));
    }
  }, [priceFeedPollerCache, assets, assetIds]);
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
