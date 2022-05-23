import { useContext, useMemo } from 'react';
import { TopLevelContext } from './top_level_context';
import { useObs } from 'app/util';
import { AssetValue } from '@aztec/sdk';

function useTopLevelContext() {
  return useContext(TopLevelContext);
}

export function useConfig() {
  return useTopLevelContext().config;
}

export function useSdk() {
  const { sdkObs } = useTopLevelContext();
  return useObs(sdkObs);
}

export function useRemoteAssets() {
  const { remoteAssetsObs } = useTopLevelContext();
  return useObs(remoteAssetsObs);
}

export function useRemoteAssetForId(assetId: number) {
  return useRemoteAssets()?.find(x => x.id === assetId);
}

export function useAmountFactory() {
  return useTopLevelContext().amountFactory;
}

export function useAmount(assetValue?: AssetValue) {
  const factory = useAmountFactory();
  return useMemo(() => assetValue && factory?.fromAssetValue(assetValue), [factory, assetValue]);
}

export function useAmounts(assetValues?: AssetValue[]) {
  const factory = useAmountFactory();
  return useMemo(
    () => assetValues && assetValues.map(assetValue => factory?.fromAssetValue(assetValue)),
    [factory, assetValues],
  );
}

export function useStableEthereumProvider() {
  return useTopLevelContext().stableEthereumProvider;
}

export function usePriceFeedPollerCache() {
  return useTopLevelContext().priceFeedPollerCache;
}

export function useGasUnitPrice() {
  const { gasPricePoller } = useTopLevelContext();
  return useObs(gasPricePoller.obs);
}

export function useBridgeDataAdaptorsMethodCaches() {
  return useTopLevelContext().bridgeDataAdaptorsMethodCaches;
}

export function useDefiRecipes() {
  return useTopLevelContext().defiRecipes;
}
