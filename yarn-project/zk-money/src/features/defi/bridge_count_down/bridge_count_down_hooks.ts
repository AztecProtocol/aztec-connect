import { BridgeCallData, BridgeConfig, isVirtualAsset } from '@aztec/sdk';
import { useRollupProviderStatus } from '../../../alt-model/index.js';
import { DefiRecipe } from '../../../alt-model/defi/types.js';
import { useDefiPulishStatsPollerCache } from '../../../alt-model/top_level_context/top_level_context_hooks.js';
import { useMaybeObs } from '../../../app/util/index.js';

export function useDefiBatchAverageTimeout(recipe: DefiRecipe, bridgeCallData?: BridgeCallData) {
  const cache = useDefiPulishStatsPollerCache();
  const poller = bridgeCallData ? cache.get(recipe.getDefiPublishStatsCacheArgs(bridgeCallData)) : undefined;
  const result = useMaybeObs(poller?.obs);
  return result?.averageTimeout;
}

// Adapted from getBridgeConfig found in falafel/src/bridge/bridge_resolver.ts
function getBridgeConfig(bridgeCallData: BridgeCallData, bridgeConfigs: BridgeConfig[]) {
  const bridgeCallDataAssets = [
    bridgeCallData.inputAssetIdA,
    bridgeCallData.inputAssetIdB,
    bridgeCallData.outputAssetIdA,
    bridgeCallData.outputAssetIdB,
  ].filter(asset => asset !== undefined && !isVirtualAsset(asset));
  return bridgeConfigs.find(bc => {
    return (
      bridgeCallData.bridgeAddressId === bc.bridgeAddressId &&
      bridgeCallDataAssets.every(bridgeCallDataAsset => bc.permittedAssets.includes(bridgeCallDataAsset!))
    );
  });
}

export function useDefiBatchData(bridgeCallData?: BridgeCallData) {
  const rpStatus = useRollupProviderStatus();
  if (!rpStatus) return;
  const bridgeCallDataNum = bridgeCallData?.toBigInt();
  const status = rpStatus.bridgeStatus.find(x => x.bridgeCallData === bridgeCallDataNum);
  const config = bridgeCallData && getBridgeConfig(bridgeCallData, rpStatus.runtimeConfig.bridgeConfigs);
  const totalSlots = status?.numTxs ?? config?.numTxs ?? rpStatus.runtimeConfig.defaultDeFiBatchSize;
  const fraction = status ? Number(status.gasAccrued) / Number(status.gasThreshold) : 0;
  const takenSlots = Math.floor(totalSlots * Math.min(1, Math.max(0, fraction)));
  const progress = takenSlots / totalSlots;
  const isFastTrack = progress >= 1;
  return { totalSlots, takenSlots, progress, isFastTrack };
}
