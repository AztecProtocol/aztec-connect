import { useContext, useMemo } from 'react';
import { TopLevelContext } from './top_level_context.js';
import { useObs } from '../../app/util/index.js';
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

export function useAccountStateManager() {
  return useContext(TopLevelContext).accountStateManager;
}

export function useAliasManager() {
  return useContext(TopLevelContext).aliasManager;
}

export function useRegistrationsRepo() {
  return useTopLevelContext().registrationsRepo;
}

export function useRemoteAssets() {
  return useRegistrationsRepo().remoteAssets;
}

export function useToasts() {
  return useObs(useTopLevelContext().toastsObs);
}

export function usePendingBalances() {
  return useObs(useTopLevelContext().pendingBalancesObs);
}

export function useWalletInteractionToasts() {
  const { walletInteractionToastsObs } = useTopLevelContext();
  return useObs(walletInteractionToastsObs);
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

export function useChainLinkPollerCache() {
  return useTopLevelContext().chainLinkPollerCache;
}

export function usePriceFeedObsCache() {
  return useTopLevelContext().priceFeedObsCache;
}

export function useGasUnitPrice() {
  const { gasPricePoller } = useTopLevelContext();
  return useObs(gasPricePoller.obs);
}

export function useDefiPulishStatsPollerCache() {
  return useTopLevelContext().defiPulishStatsPollerCache;
}

export function useBridgeDataAdaptorsMethodCaches() {
  return useTopLevelContext().bridgeDataAdaptorsMethodCaches;
}

export function useDefiRecipes() {
  return useTopLevelContext().defiRecipes;
}
