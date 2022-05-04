import { BridgeId } from '@aztec/sdk';
import { useRollupProviderStatus } from 'alt-model';
import { useDefaultBridgeId } from 'alt-model/defi/defi_info_hooks';
import { DefiRecipe } from 'alt-model/defi/types';
import { estimateDefiSettlementTimes } from 'alt-model/estimate_settlement_times';

export function useCountDownData(bridgeId?: BridgeId) {
  const rpStatus = useRollupProviderStatus();
  if (!rpStatus) return;
  const bridgeIdNum = bridgeId?.toBigInt();
  const status = rpStatus.bridgeStatus.find(x => x.bridgeId === bridgeIdNum);
  const totalSlots = status?.numTxs ?? rpStatus.runtimeConfig.defaultDeFiBatchSize;
  const fraction = status ? Number(status.gasAccrued) / Number(status.gasThreshold) : 0;
  const takenSlots = Math.floor(totalSlots * Math.min(1, Math.max(0, fraction)));
  const { batchSettlementTime } = estimateDefiSettlementTimes(rpStatus, status);

  return { totalSlots, takenSlots, nextBatch: batchSettlementTime };
}

export function useDefaultCountDownData(recipe: DefiRecipe) {
  const bridgeId = useDefaultBridgeId(recipe);
  return useCountDownData(bridgeId);
}
