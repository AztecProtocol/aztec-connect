import { AssetValue, UserDefiInteractionResultState } from '@aztec/sdk';
import { useMemo } from 'react';
import { useAggregatedAssetsBulkPrice } from './price_hooks.js';
import { useBridgeDataAdaptorsMethodCaches, useDefiRecipes } from './top_level_context/index.js';
import { useDefiTxs } from './defi_txs_hooks.js';
import { Obs, useMaybeObs, useObs } from '../app/util/obs/index.js';
import { recipeMatcher } from './defi/recipe_matchers.js';
import { useBalances, useSpendableBalances } from './balance_hooks.js';
import { concatDefined } from '../app/util/arrays.js';
import { useHiddenAssets } from './defi/hidden_asset_hooks.js';

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

function useDebtsAndCollaterals(balances: AssetValue[] | undefined) {
  const recipes = useDefiRecipes();
  const cache = useBridgeDataAdaptorsMethodCaches().userDebtAndCollateralPollerCache;
  const debtAndCollateralValuesObs = useMemo(() => {
    const obsList: Obs<AssetValue | undefined>[] = [];
    for (const assetValue of balances ?? []) {
      const recipe = recipes.find(x => x.openHandleAsset?.id === assetValue.assetId);
      if (recipe?.openHandleAssetHasDebtAndCollateral) {
        const poller = cache.get([recipe.id, assetValue.value]);
        if (poller) {
          // This input/output id alignment is the case for Liquity Trove. If
          // we add bridges that don't follow this pattern, more thought is
          // required.
          const collateralAssetId = recipe.flow.enter.inA.id;
          const colatteralObs = poller.obs.map(debtAndCollateral =>
            debtAndCollateral ? { assetId: collateralAssetId, value: debtAndCollateral[1] } : undefined,
          );
          obsList.push(colatteralObs);
          const debtAssetId = recipe.flow.enter.outB?.id;
          if (debtAssetId) {
            const debtObs: Obs<AssetValue | undefined> = poller.obs.map(debtAndCollateral =>
              // Note we're using a negative assetValue here. Watch out for
              // unexpected bahaviour!
              debtAndCollateral ? { assetId: debtAssetId, value: -debtAndCollateral[0] } : undefined,
            );
            obsList.push(debtObs);
          } else {
            console.error(`Could not determine debt assetId for '${recipe.id}'`);
          }
        }
      }
    }
    return Obs.combine(obsList);
  }, [balances, recipes, cache]);
  return useObs(debtAndCollateralValuesObs);
}

export function useTotalValuation() {
  const balances = useBalances();
  const unfinalisedPresentValues = useUnfinalisedAsyncDefiAsyncPresentValues();
  const debtsAndCollaterals = useDebtsAndCollaterals(balances);
  const hiddenValues = useHiddenAssets();
  const presentValuesAreLoading = !unfinalisedPresentValues || Object.values(unfinalisedPresentValues).some(x => !x);
  const combinedAssetValues = useMemo(() => {
    let out: AssetValue[] = [];
    out = concatDefined(out, balances);
    out = concatDefined(out, unfinalisedPresentValues);
    out = concatDefined(out, debtsAndCollaterals);
    out = out.filter(x1 => !hiddenValues.some(x2 => x1.assetId === x2.id));
    return out;
  }, [balances, unfinalisedPresentValues, debtsAndCollaterals, hiddenValues]);
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
