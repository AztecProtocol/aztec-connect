import type { BridgeStatus, RollupProviderStatus } from '@aztec/sdk';

const APPROX_ROLLUP_PROOF_DURATION_MS = 1000 * 60 * 7;

interface EstimatedTxSettlementTimes {
  instantSettlementTime?: Date;
  nextSettlementTime?: Date;
}

function estimateNextSettlementTime(nextPublishTimeMs: number, nowMs: number, publishIntervalSeconds: number) {
  if (nextPublishTimeMs > nowMs) return new Date(nextPublishTimeMs + APPROX_ROLLUP_PROOF_DURATION_MS);
  if (publishIntervalSeconds > 0) new Date(nowMs + APPROX_ROLLUP_PROOF_DURATION_MS + publishIntervalSeconds * 1000);
}

export function estimateTxSettlementTimes(rpStatus?: RollupProviderStatus): EstimatedTxSettlementTimes {
  if (!rpStatus) return {};
  const { nextPublishTime, runtimeConfig } = rpStatus;
  const nextPublishTimeMs = nextPublishTime.getTime();
  const nowMs = Date.now();
  const instantSettlementTime = new Date(nowMs + APPROX_ROLLUP_PROOF_DURATION_MS);
  const nextSettlementTime = estimateNextSettlementTime(nextPublishTimeMs, nowMs, runtimeConfig.publishInterval);
  return { instantSettlementTime, nextSettlementTime };
}

function estimateDefiBatchSettlementTime(
  rpStatus?: RollupProviderStatus,
  bridgeStatus?: BridgeStatus,
  nextSettlementTime?: Date,
) {
  if (!rpStatus || !bridgeStatus) return;
  const { nextPublishTime, rollupFrequency } = bridgeStatus;
  if (nextPublishTime) return nextPublishTime;
  const publishIntervalSeconds = rpStatus.runtimeConfig.publishInterval;
  if (rollupFrequency > 0 && publishIntervalSeconds > 0 && nextSettlementTime) {
    const defiBatchInterval = rollupFrequency * (publishIntervalSeconds * 1000);
    return new Date(nextSettlementTime.getTime() + defiBatchInterval);
  }
}

interface EstimatedDefiSettlementTimes extends EstimatedTxSettlementTimes {
  batchSettlementTime?: Date;
}

export function estimateDefiSettlementTimes(
  rpStatus?: RollupProviderStatus,
  bridgeStatus?: BridgeStatus,
): EstimatedDefiSettlementTimes {
  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rpStatus);
  return {
    instantSettlementTime,
    nextSettlementTime,
    batchSettlementTime: estimateDefiBatchSettlementTime(rpStatus, bridgeStatus, nextSettlementTime),
  };
}
