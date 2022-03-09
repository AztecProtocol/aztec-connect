import { useContext } from 'react';
import { TopLevelContext } from './top_level_context';
import { useObs } from 'app/util';

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

export function usePriceFeedObsCache() {
  return useTopLevelContext().priceFeedObsCache;
}

export function useBridgeDataAdaptorsMethodCaches() {
  return useTopLevelContext().bridgeDataAdaptorsMethodCaches;
}

export function useDefiRecipes() {
  const { defiRecipesObs } = useTopLevelContext();
  return useObs(defiRecipesObs);
}
