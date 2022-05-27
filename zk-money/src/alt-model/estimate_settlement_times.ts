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

export function estimateTxSettlementTimes(rollupProviderStatus?: RollupProviderStatus): EstimatedTxSettlementTimes {
  if (!rollupProviderStatus) return {};
  const { nextPublishTime, runtimeConfig } = rollupProviderStatus;
  const nextPublishTimeMs = nextPublishTime.getTime();
  const nowMs = Date.now();
  const instantSettlementTime = new Date(nowMs + APPROX_ROLLUP_PROOF_DURATION_MS);
  const nextSettlementTime = estimateNextSettlementTime(nextPublishTimeMs, nowMs, runtimeConfig.publishInterval);
  return { instantSettlementTime, nextSettlementTime };
}

function estimateDefiBatchSettlementTime(
  rollupProviderStatus?: RollupProviderStatus,
  bridgeStatus?: BridgeStatus,
  nextSettlementTime?: Date,
) {
  if (!rollupProviderStatus || !bridgeStatus) return;
  const { nextPublishTime, rollupFrequency } = bridgeStatus;
  if (nextPublishTime) return new Date(nextPublishTime.getTime() + APPROX_ROLLUP_PROOF_DURATION_MS);
  const publishIntervalSeconds = rollupProviderStatus.runtimeConfig.publishInterval;
  if (rollupFrequency > 0 && publishIntervalSeconds > 0 && nextSettlementTime) {
    const defiBatchInterval = rollupFrequency * (publishIntervalSeconds * 1000);
    return new Date(nextSettlementTime.getTime() + defiBatchInterval + APPROX_ROLLUP_PROOF_DURATION_MS);
  }
}

interface EstimatedDefiSettlementTimes extends EstimatedTxSettlementTimes {
  batchSettlementTime?: Date;
}

export function estimateDefiSettlementTimes(
  rollupProviderStatus?: RollupProviderStatus,
  bridgeStatus?: BridgeStatus,
): EstimatedDefiSettlementTimes {
  const { instantSettlementTime, nextSettlementTime } = estimateTxSettlementTimes(rollupProviderStatus);
  return {
    instantSettlementTime,
    nextSettlementTime,
    batchSettlementTime: estimateDefiBatchSettlementTime(rollupProviderStatus, bridgeStatus, nextSettlementTime),
  };
}
