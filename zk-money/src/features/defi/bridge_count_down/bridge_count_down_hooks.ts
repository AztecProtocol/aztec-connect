import { BridgeCallData } from '@aztec/sdk';
import { useRollupProviderStatus } from 'alt-model';
import { useDefaultBridgeCallData } from 'alt-model/defi/defi_info_hooks';
import { DefiRecipe } from 'alt-model/defi/types';
import { estimateDefiSettlementTimes } from 'alt-model/estimate_settlement_times';

export function useCountDownData(bridgeCallData?: BridgeCallData) {
  const rpStatus = useRollupProviderStatus();
  if (!rpStatus) return;
  const bridgeCallDataNum = bridgeCallData?.toBigInt();
  const status = rpStatus.bridgeStatus.find(x => x.bridgeCallData === bridgeCallDataNum);
  const totalSlots = status?.numTxs ?? rpStatus.runtimeConfig.defaultDeFiBatchSize;
  const fraction = status ? Number(status.gasAccrued) / Number(status.gasThreshold) : 0;
  const takenSlots = Math.floor(totalSlots * Math.min(1, Math.max(0, fraction)));
  const { batchSettlementTime } = estimateDefiSettlementTimes(rpStatus, status);

  return { totalSlots, takenSlots, nextBatch: batchSettlementTime };
}

export function useDefaultCountDownData(recipe: DefiRecipe) {
  const bridgeCallData = useDefaultBridgeCallData(recipe);
  return useCountDownData(bridgeCallData);
}
