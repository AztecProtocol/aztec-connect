import { toBigIntBE, toBufferBE } from '../bigint_buffer/index.js';

export interface BridgeStatus {
  bridgeCallData: bigint;
  numTxs: number;
  gasThreshold: number;
  gasAccrued: number;
  rollupFrequency: number;
  nextRollupNumber?: number;
  nextPublishTime?: Date;
}

export interface BridgeStatusJson {
  bridgeCallData: string;
  numTxs: number;
  gasThreshold: number;
  gasAccrued: number;
  rollupFrequency: number;
  nextRollupNumber?: number;
  nextPublishTime?: string;
}

export function bridgeStatusToJson({ bridgeCallData, nextPublishTime, ...rest }: BridgeStatus): BridgeStatusJson {
  return {
    ...rest,
    bridgeCallData: toBufferBE(bridgeCallData, 32).toString('hex'),
    nextPublishTime: nextPublishTime?.toISOString(),
  };
}

export function bridgeStatusFromJson({ bridgeCallData, nextPublishTime, ...rest }: BridgeStatusJson): BridgeStatus {
  return {
    ...rest,
    bridgeCallData: toBigIntBE(Buffer.from(bridgeCallData, 'hex')),
    nextPublishTime: nextPublishTime ? new Date(nextPublishTime) : undefined,
  };
}
