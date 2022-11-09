import type { RollupProviderStatus } from '@aztec/sdk';

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
