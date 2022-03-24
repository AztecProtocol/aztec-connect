import createDebug from 'debug';
import { AssetValue, BitConfig, BridgeId } from '@aztec/sdk';
import { useAggregatedAssetsPrice, useAssetPrice, useRollupProviderStatus } from 'alt-model';
import { useEffect, useMemo, useState } from 'react';
import { toAdaptorArgs } from './bridge_data_adaptors/bridge_adaptor_util';
import { DefiRecipe } from './types';
import { baseUnitsToFloat, convertToPrice, PRICE_DECIMALS, tenTo } from 'app';
import { useBridgeDataAdaptorsMethodCaches } from 'alt-model/top_level_context';
import { useMaybeObs, useObs } from 'app/util';

const debug = createDebug('zm:defi_info_hooks');

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
    const { addressId, inputAssetA, outputAssetA } = recipe;
    if (auxData === undefined) return undefined;
    // TODO: use more complete bridge id construction
    return new BridgeId(addressId, inputAssetA.id, outputAssetA.id, 0, 0, BitConfig.EMPTY, Number(auxData));
  }, [recipe, auxData]);
}

function useAdaptorArgs(recipe: DefiRecipe) {
  const rpStatus = useRollupProviderStatus();
  const assets = rpStatus?.blockchainStatus.assets;
  return useMemo(() => {
    if (assets) {
      try {
        return toAdaptorArgs(assets, recipe);
      } catch (e) {
        debug('Failed to convert BridgeId to adaptor args', e);
        return;
      }
    }
  }, [recipe, assets]);
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

function useExpectedYield(recipe: DefiRecipe, auxData?: bigint) {
  const rpStatus = useRollupProviderStatus();
  const assets = rpStatus?.blockchainStatus.assets;
  const inputAssetId = recipe.inputAssetA.id;
  const inputAsset = assets?.[inputAssetId];
  const inputValue = useMemo(() => (inputAsset ? tenTo(inputAsset?.decimals) : undefined), [inputAsset]);

  const output = useExpectedYearlyOuput(recipe.id, auxData, inputValue);
  const outputAsset = output ? assets?.[output.assetId] : undefined;
  const outputAssetPrice = useAssetPrice(output?.assetId);
  const inputAssetPrice = useAssetPrice(inputAssetId);
  const inputPrice =
    inputAsset && inputAssetPrice !== undefined && inputValue !== undefined
      ? convertToPrice(inputValue, inputAsset.decimals, inputAssetPrice)
      : undefined;

  const outputValue = output?.value;
  const outputPrice =
    outputAsset && outputAssetPrice !== undefined && outputValue !== undefined
      ? convertToPrice(outputValue, outputAsset.decimals, outputAssetPrice)
      : undefined;

  if (outputPrice === undefined || inputPrice === undefined) return undefined;
  const diff = baseUnitsToFloat(outputPrice - inputPrice, PRICE_DECIMALS);
  const divisor = baseUnitsToFloat(inputPrice, PRICE_DECIMALS);
  return diff / divisor;
}

export function useDefaultExpectedYield(recipe: DefiRecipe) {
  const auxData = useDefaultAuxDataOption(recipe.id);
  return useExpectedYield(recipe, auxData);
}

function useExpectedOutput(recipe: DefiRecipe, auxData?: bigint, inputValue?: bigint) {
  const [output, setOutput] = useState<AssetValue>();
  const dataAdaptor = useBridgeDataAdaptor(recipe.id);
  const adaptorArgs = useAdaptorArgs(recipe);
  useEffect(() => {
    if (dataAdaptor && adaptorArgs && auxData !== undefined && inputValue !== undefined) {
      const { inA, inB, outA, outB } = adaptorArgs;
      dataAdaptor.adaptor.getExpectedOutput(inA, inB, outA, outB, auxData, inputValue).then(values => {
        setOutput({ assetId: Number(outA.id), value: values[0] });
      });
    }
  }, [dataAdaptor, adaptorArgs, auxData, inputValue]);
  return output;
}

export function useDefaultExpectedOutput(recipe: DefiRecipe, inputValue?: bigint) {
  const auxData = useDefaultAuxDataOption(recipe.id);
  return useExpectedOutput(recipe, auxData, inputValue);
}
