import { useContext, useMemo } from 'react';
import { TopLevelContext } from './top_level_context';
import { useObs } from 'app/util';
import { AssetValue } from '@aztec/sdk';

function useTopLevelContext() {
  return useContext(TopLevelContext);
}

export function useRemoteAssets() {
  const { remoteAssetsObs } = useTopLevelContext();
  return useObs(remoteAssetsObs);
}

export function useRemoteAssetForId(assetId: number) {
  return useRemoteAssets()?.find(x => x.id === assetId);
}

export function useAmountFactory() {
  const { amountFactoryObs } = useTopLevelContext();
  return useObs(amountFactoryObs);
}

export function useAmount(assetValue?: AssetValue) {
  const factory = useAmountFactory();
  return useMemo(() => assetValue && factory?.fromAssetValue(assetValue), [factory, assetValue]);
}

export function useStableEthereumProvider() {
  return useTopLevelContext().stableEthereumProvider;
}

export function usePriceFeedObsCache() {
  return useTopLevelContext().priceFeedObsCache;
}

export function useGasPrice() {
  const { gasPriceObs } = useTopLevelContext();
  return useObs(gasPriceObs);
}

export function useBridgeDataAdaptorsMethodCaches() {
  return useTopLevelContext().bridgeDataAdaptorsMethodCaches;
}

export function useDefiRecipes() {
  const { defiRecipesObs } = useTopLevelContext();
  return useObs(defiRecipesObs);
}
