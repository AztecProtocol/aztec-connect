import { AssetValue, UserDefiInteractionResultState } from '@aztec/sdk';
import { useMemo } from 'react';
import { useAggregatedAssetsBulkPrice } from './price_hooks.js';
import { useBridgeDataAdaptorsMethodCaches, useDefiRecipes } from './top_level_context/index.js';
import { useDefiTxs } from './defi_txs_hooks.js';
import { Obs, useMaybeObs } from '../app/util/obs/index.js';
import { recipeMatcher } from './defi/recipe_matchers.js';
import { useBalances, useSpendableBalances } from './balance_hooks.js';

function useUnfinalisedAsyncDefiAsyncPresentValues() {
  const { interactionPresentValuePollerCache } = useBridgeDataAdaptorsMethodCaches();
  const defiTxs = useDefiTxs();
  const recipes = useDefiRecipes();
  const assetValuesObs = useMemo(() => {
    if (!defiTxs || !recipes) return;
    const obsList: Obs<AssetValue[] | undefined>[] = [];
    for (const tx of defiTxs) {
      if (
        tx.interactionResult.isAsync &&
        tx.interactionResult.state === UserDefiInteractionResultState.AWAITING_FINALISATION &&
        tx.interactionResult.interactionNonce !== undefined
      ) {
        const recipe = recipes.find(recipeMatcher(tx.bridgeCallData));
        if (recipe) {
          const poller = interactionPresentValuePollerCache.get([
            recipe.id,
            tx.interactionResult.interactionNonce,
            tx.depositValue.value,
          ]);
          obsList.push(poller?.obs ?? Obs.constant(undefined));
        }
      }
    }
    return Obs.combine(obsList);
  }, [defiTxs, interactionPresentValuePollerCache, recipes]);
  const unflattenedAssetValues = useMaybeObs(assetValuesObs);
  return useMemo(() => unflattenedAssetValues?.flatMap(assetValues => assetValues), [unflattenedAssetValues]);
}

export function useTotalValuation() {
  const balances = useBalances();
  const unfinalisedPresentValues = useUnfinalisedAsyncDefiAsyncPresentValues();
  const presentValuesAreLoading = !unfinalisedPresentValues || Object.values(unfinalisedPresentValues).some(x => !x);
  const combinedAssetValues = useMemo(() => {
    if (balances && unfinalisedPresentValues) {
      return unfinalisedPresentValues.filter((x): x is AssetValue => !!x).concat(balances);
    }
  }, [balances, unfinalisedPresentValues]);
  const aggregationState = useAggregatedAssetsBulkPrice(combinedAssetValues);
  return {
    ...aggregationState,
    loading: aggregationState.loading || presentValuesAreLoading,
  };
}

export function useTotalSpendableValuation() {
  const balances = useSpendableBalances();
  return useAggregatedAssetsBulkPrice(balances);
}
