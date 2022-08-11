import { useMemo } from 'react';
import { BridgeCallData, UserDefiTx } from '@aztec/sdk';
import { DefiRecipe, FlowDirection } from './types';
import { useAmount, useBridgeDataAdaptorsMethodCaches, useDefiRecipes } from 'alt-model/top_level_context';
import { useMaybeObs } from 'app/util';
import { Amount } from 'alt-model/assets';
import { useAmountBulkPrice } from 'alt-model/price_hooks';

export function useBridgeDataAdaptor(recipeId: string) {
  const { adaptorsCache } = useBridgeDataAdaptorsMethodCaches();
  return adaptorsCache.get(recipeId);
}

export function useDefaultAuxDataOption(recipeId: string, isExit?: boolean) {
  const { auxDataPollerCache } = useBridgeDataAdaptorsMethodCaches();
  const recipes = useDefiRecipes();
  const opts = useMaybeObs(auxDataPollerCache.get(recipeId)?.obs);
  const recipe = recipes.find(x => x.id === recipeId);
  if (!recipe || !opts) return;
  if (isExit && recipe.selectExitAuxDataOpt) return recipe.selectExitAuxDataOpt(opts);
  return recipe.selectEnterAuxDataOpt(opts);
}

export function useDefaultBridgeCallData(recipe: DefiRecipe) {
  const auxData = useDefaultAuxDataOption(recipe.id);
  return useMemo(() => {
    const { bridgeAddressId, flow } = recipe;
    if (auxData === undefined) return undefined;
    // TODO: use more complete bridge call data construction
    return new BridgeCallData(
      bridgeAddressId,
      flow.enter.inA.id,
      flow.enter.outA.id,
      undefined,
      undefined,
      Number(auxData),
    );
  }, [recipe, auxData]);
}

function useBridgeMarket(recipeId: string, auxData?: bigint) {
  const { marketSizePollerCache } = useBridgeDataAdaptorsMethodCaches();
  const poller = auxData !== undefined ? marketSizePollerCache.get([recipeId, auxData]) : undefined;
  return useMaybeObs(poller?.obs);
}
export function useDefaultBridgeMarket(recipeId: string) {
  const auxData = useDefaultAuxDataOption(recipeId);
  return useBridgeMarket(recipeId, auxData);
}

function useLiquidity(recipeId: string, auxData?: bigint) {
  const market = useBridgeMarket(recipeId, auxData);
  const amount = useAmount(market?.[0]);
  return useAmountBulkPrice(amount);
}

export function useDefaultLiquidity(recipeId: string) {
  const auxData = useDefaultAuxDataOption(recipeId);
  return useLiquidity(recipeId, auxData);
}

export function useExpectedAssetYield(recipe: DefiRecipe, auxData?: bigint) {
  const inputValue = Amount.from('1', recipe.valueEstimationInteractionAssets.inA);
  const { expectedAssetYieldPollerCache } = useBridgeDataAdaptorsMethodCaches();
  const poller =
    auxData === undefined || inputValue === undefined
      ? undefined
      : expectedAssetYieldPollerCache.get([recipe.id, auxData, inputValue.baseUnits]);
  return useMaybeObs(poller?.obs);
}

export function useCurrentAssetYield(recipe: DefiRecipe, interactionNonce: number) {
  const { currentAssetYieldPollerCache } = useBridgeDataAdaptorsMethodCaches();
  const poller =
    interactionNonce === undefined ? undefined : currentAssetYieldPollerCache.get([recipe.id, interactionNonce]);
  return useMaybeObs(poller?.obs);
}

export function useDefaultExpectedAssetYield(recipe: DefiRecipe) {
  const auxData = useDefaultAuxDataOption(recipe.id);
  return useExpectedAssetYield(recipe, auxData);
}

export function useExpectedOutput(
  recipeId: string,
  flowDirection: FlowDirection,
  auxData?: bigint,
  inputValue?: bigint,
) {
  const { expectedOutputPollerCache } = useBridgeDataAdaptorsMethodCaches();
  const poller =
    auxData !== undefined && inputValue !== undefined
      ? expectedOutputPollerCache.get([recipeId, auxData, inputValue, flowDirection])
      : undefined;
  return useMaybeObs(poller?.obs);
}

export function useInteractionPresentValue(recipe: DefiRecipe, tx: UserDefiTx) {
  const { interactionPresentValuePollerCache } = useBridgeDataAdaptorsMethodCaches();
  const { interactionNonce } = tx.interactionResult;
  const poller =
    interactionNonce !== undefined
      ? interactionPresentValuePollerCache.get([recipe.id, BigInt(interactionNonce), tx.depositValue.value])
      : undefined;
  return useMaybeObs(poller?.obs);
}

export function useDefaultExpectedOutput(recipe: DefiRecipe, flowDirection: FlowDirection, inputValue?: bigint) {
  const auxData = useDefaultAuxDataOption(recipe.id);
  return useExpectedOutput(recipe.id, flowDirection, auxData, inputValue);
}
