import { BridgeStatus, RollupProviderStatus } from '@aztec/sdk';
import { useRollupProviderStatus } from 'alt-model';
import { useDefaultBridgeId } from 'alt-model/defi/defi_info_hooks';
import { DefiRecipe } from 'alt-model/defi/types';

function calcNextBatch(rpStatus: RollupProviderStatus, bridgeStatus?: BridgeStatus) {
  if (!bridgeStatus) return;
  if (bridgeStatus.nextPublishTime) return bridgeStatus.nextPublishTime;
  const { rollupFrequency } = bridgeStatus;
  const { nextPublishTime } = rpStatus;
  const { publishInterval } = rpStatus.runtimeConfig;
  if (rollupFrequency && nextPublishTime && publishInterval) {
    const offset = nextPublishTime.getTime();
    const wait = rollupFrequency * (publishInterval * 1000);
    return new Date(offset + wait);
  }
}

export function useCountDownData(recipe: DefiRecipe) {
  const bridgeId = useDefaultBridgeId(recipe)?.toBigInt();
  const rpStatus = useRollupProviderStatus();
  if (!rpStatus) return;
  const status = rpStatus.bridgeStatus.find(x => x.bridgeId === bridgeId);
  const totalSlots = status?.numTxs ?? rpStatus.runtimeConfig.defaultDeFiBatchSize;
  const fraction = status ? Number(status.gasAccrued) / Number(status.gasThreshold) : 0;
  const takenSlots = Math.floor(totalSlots * Math.min(1, Math.max(0, fraction)));
  const nextBatch = calcNextBatch(rpStatus, status);

  return { totalSlots, takenSlots, nextBatch };
}
