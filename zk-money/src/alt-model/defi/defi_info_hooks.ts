import { useMemo } from 'react';
import { BridgeId } from '@aztec/sdk';
import { useAggregatedAssetsPrice } from 'alt-model';
import { DefiRecipe } from './types';
import { baseUnitsToFloat, PRICE_DECIMALS } from 'app';
import { useAmount, useBridgeDataAdaptorsMethodCaches } from 'alt-model/top_level_context';
import { useMaybeObs, useObs } from 'app/util';
import { Amount } from 'alt-model/assets';
import { useAmountCost } from 'alt-model/price_hooks';

export function useBridgeDataAdaptor(recipeId: string) {
  const { adaptorsObsCache } = useBridgeDataAdaptorsMethodCaches();
  return useObs(adaptorsObsCache.get(recipeId));
}

export function useDefaultAuxDataOption(recipeId: string) {
  const { auxDataObsCache } = useBridgeDataAdaptorsMethodCaches();
  const opts = useObs(auxDataObsCache.get(recipeId));
  // TODO: don't assume last element is default choice
  return opts?.[opts?.length - 1];
}

export function useDefaultBridgeId(recipe: DefiRecipe) {
  const auxData = useDefaultAuxDataOption(recipe.id);
  return useMemo(() => {
    const { addressId, flow } = recipe;
    if (auxData === undefined) return undefined;
    // TODO: use more complete bridge id construction
    return new BridgeId(addressId, flow.enter.inA.id, flow.enter.outA.id, undefined, undefined, Number(auxData));
  }, [recipe, auxData]);
}

function useBridgeMarket(recipeId: string, auxData?: bigint) {
  const { marketSizeObsCache } = useBridgeDataAdaptorsMethodCaches();
  const obs = auxData !== undefined ? marketSizeObsCache.get([recipeId, auxData]) : undefined;
  return useMaybeObs(obs);
}
export function useDefaultBridgeMarket(recipeId: string) {
  const auxData = useDefaultAuxDataOption(recipeId);
  return useBridgeMarket(recipeId, auxData);
}

function useLiquidity(recipeId: string, auxData?: bigint) {
  const market = useBridgeMarket(recipeId, auxData);
  return useAggregatedAssetsPrice(market);
}

export function useDefaultLiquidity(recipeId: string) {
  const auxData = useDefaultAuxDataOption(recipeId);
  return useLiquidity(recipeId, auxData);
}

function useExpectedYearlyOuput(recipeId: string, auxData?: bigint, inputValue?: bigint) {
  const { expectedYearlyOutputObsCache } = useBridgeDataAdaptorsMethodCaches();
  const obs =
    auxData === undefined || inputValue === undefined
      ? undefined
      : expectedYearlyOutputObsCache.get([recipeId, auxData, inputValue]);
  return useMaybeObs(obs);
}

export function useExpectedYield(recipe: DefiRecipe, auxData?: bigint) {
  const inputAmount = Amount.from('1', recipe.valueEstimationInteractionAssets.inA);
  const output = useExpectedYearlyOuput(recipe.id, auxData, inputAmount.baseUnits);
  const outputAmount = useAmount(output);

  const inputCost = useAmountCost(inputAmount);
  const outputCost = useAmountCost(outputAmount);

  if (outputCost === undefined || inputCost === undefined) return undefined;
  const diff = baseUnitsToFloat(outputCost - inputCost, PRICE_DECIMALS);
  const divisor = baseUnitsToFloat(inputCost, PRICE_DECIMALS);
  return diff / divisor;
}

export function useDefaultExpectedYield(recipe: DefiRecipe) {
  const auxData = useDefaultAuxDataOption(recipe.id);
  return useExpectedYield(recipe, auxData);
}

export function useExpectedOutput(recipeId: string, auxData?: bigint, inputValue?: bigint) {
  const { expectedOutputObsCache } = useBridgeDataAdaptorsMethodCaches();
  const obs =
    auxData !== undefined && inputValue !== undefined
      ? expectedOutputObsCache.get([recipeId, auxData, inputValue])
      : undefined;
  return useMaybeObs(obs);
}

export function useInteractionPresentValue(recipe: DefiRecipe, interactionNonce?: number) {
  const { interactionPresentValueObsCache } = useBridgeDataAdaptorsMethodCaches();
  const obs =
    interactionNonce !== undefined
      ? interactionPresentValueObsCache.get([recipe.id, BigInt(interactionNonce)])
      : undefined;
  return useMaybeObs(obs);
}

export function useDefaultExpectedOutput(recipe: DefiRecipe, inputValue?: bigint) {
  const auxData = useDefaultAuxDataOption(recipe.id);
  return useExpectedOutput(recipe.id, auxData, inputValue);
}
