import { AssetValue, UserDefiInteractionResultState } from '@aztec/sdk';
import { useMemo } from 'react';
import { useAggregatedAssetsBulkPrice } from './price_hooks';
import { useBridgeDataAdaptorsMethodCaches, useDefiRecipes } from './top_level_context';
import { useDefiTxs } from './defi_txs_hooks';
import { Obs, useMaybeObs } from 'app/util/obs';
import { recipeMatcher } from './defi/recipe_matchers';
import { useBalances, useSpendableBalances } from './balance_hooks';

function useUnfinalisedAsyncDefiAsyncPresentValues() {
  const { interactionPresentValueObsCache } = useBridgeDataAdaptorsMethodCaches();
  const defiTxs = useDefiTxs();
  const recipes = useDefiRecipes();
  const assetValuesObs = useMemo(() => {
    if (!defiTxs || !recipes) return;
    const obsList: Obs<AssetValue | undefined>[] = [];
    for (const tx of defiTxs) {
      if (
        tx.interactionResult.isAsync &&
        tx.interactionResult.state === UserDefiInteractionResultState.AWAITING_FINALISATION &&
        tx.interactionResult.interactionNonce !== undefined
      ) {
        const recipe = recipes.find(recipeMatcher(tx.bridgeId));
        if (recipe) {
          const obs = interactionPresentValueObsCache.get([recipe.id, BigInt(tx.interactionResult.interactionNonce)]);
          obsList.push(obs);
        }
      }
    }
    return Obs.combine(obsList);
  }, [defiTxs]);
  return useMaybeObs(assetValuesObs);
}

export function useTotalValuation() {
  const balances = useBalances();
  const unfinalisedPresentValues = useUnfinalisedAsyncDefiAsyncPresentValues();
  const combinedAssetValues = useMemo(() => {
    if (balances && unfinalisedPresentValues) {
      return unfinalisedPresentValues.filter((x): x is AssetValue => !!x).concat(balances);
    }
  }, [balances, unfinalisedPresentValues]);
  return useAggregatedAssetsBulkPrice(combinedAssetValues);
}

export function useTotalSpendableValuation() {
  const balances = useSpendableBalances();
  return useAggregatedAssetsBulkPrice(balances);
}
