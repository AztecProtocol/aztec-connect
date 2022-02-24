import createDebug from 'debug';
import { AssetValue, BridgeId } from '@aztec/sdk';
import { useAggregatedAssetsPrice, useAssetPrice, useRollupProviderStatus } from 'alt-model';
import { useEffect, useMemo, useState } from 'react';
import { toAdaptorArgs } from './bridge_data_adaptors/bridge_adaptor_util';
import { BridgeDataAdaptor, BridgeDataAdaptorCreator } from './bridge_data_adaptors/types';
import { DefiRecipe } from './types';
import { baseUnitsToFloat, convertToPrice, PRICE_DECIMALS, tenTo } from 'app';
import { useStableEthereumProvider } from 'alt-model/top_level_context/top_level_context';
import { Web3Provider } from '@ethersproject/providers';
import { useBridgeDataAdaptorsMethodCaches } from 'alt-model/top_level_context';
import { useMaybeObs, useObs } from 'app/util';

const debug = createDebug('zm:defi_info_hooks');

export function useBridgeDataAdaptor(creator: BridgeDataAdaptorCreator) {
  const provider = useStableEthereumProvider();
  return useMemo(() => creator(new Web3Provider(provider)), [provider, creator]);
}

function useAdaptorArgs(bridgeId: BridgeId) {
  const rpStatus = useRollupProviderStatus();
  const assets = rpStatus?.blockchainStatus.assets;
  return useMemo(() => {
    if (assets) {
      try {
        return toAdaptorArgs(assets, bridgeId);
      } catch (e) {
        debug('Failed to convert BridgeId to adaptor args', e);
        return;
      }
    }
  }, [bridgeId, assets]);
}

function useBridgeMarket(recipe: DefiRecipe) {
  const { marketSizeObsCache } = useBridgeDataAdaptorsMethodCaches();
  return useObs(marketSizeObsCache.get(recipe));
}

export function useLiquidity(recipe: DefiRecipe) {
  const market = useBridgeMarket(recipe);
  return useAggregatedAssetsPrice(market);
}

function useExpectedYearlyOuput(recipe: DefiRecipe, inputValue?: bigint) {
  const { expectedYearlyOutputObsCache } = useBridgeDataAdaptorsMethodCaches();
  const obs = inputValue === undefined ? undefined : expectedYearlyOutputObsCache.get([recipe, inputValue]);
  return useMaybeObs(obs);
}

export function useExpectedYield(recipe: DefiRecipe) {
  const rpStatus = useRollupProviderStatus();
  const assets = rpStatus?.blockchainStatus.assets;
  const inputAssetId = recipe.bridgeFlow.enter.inputAssetIdA;
  const inputAsset = assets?.[inputAssetId];
  const inputValue = useMemo(() => (inputAsset ? tenTo(inputAsset?.decimals) : undefined), [inputAsset]);

  const output = useExpectedYearlyOuput(recipe, inputValue);
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

export function useExpectedOutput(dataAdaptor: BridgeDataAdaptor, bridgeId: BridgeId, inputValue: bigint) {
  const [output, setOutput] = useState<AssetValue>();
  const adaptorArgs = useAdaptorArgs(bridgeId);
  useEffect(() => {
    if (adaptorArgs) {
      const { inA, inB, outA, outB, aux } = adaptorArgs;
      dataAdaptor.adaptor.getExpectedOutput(inA, inB, outA, outB, aux, inputValue).then(values => {
        setOutput({ assetId: Number(outA.id), value: values[0] });
      });
    }
  }, [adaptorArgs, dataAdaptor, inputValue]);
  return output;
}
