import { toBigIntBE, toBufferBE } from '../bigint_buffer';

export interface BridgeStatus {
  bridgeId: bigint;
  numTxs: number;
  gasThreshold: number;
  gasAccrued: number;
  rollupFrequency: number;
  nextRollupNumber?: number;
  nextPublishTime?: Date;
}

export interface BridgeStatusJson {
  bridgeId: string;
  numTxs: number;
  gasThreshold: number;
  gasAccrued: number;
  rollupFrequency: number;
  nextRollupNumber?: number;
  nextPublishTime?: string;
}

export function bridgeStatusToJson({ bridgeId, nextPublishTime, ...rest }: BridgeStatus): BridgeStatusJson {
  return {
    ...rest,
    bridgeId: toBufferBE(bridgeId, 32).toString('hex'),
    nextPublishTime: nextPublishTime?.toISOString(),
  };
}

export function bridgeStatusFromJson({ bridgeId, nextPublishTime, ...rest }: BridgeStatusJson): BridgeStatus {
  return {
    ...rest,
    bridgeId: toBigIntBE(Buffer.from(bridgeId, 'hex')),
    nextPublishTime: nextPublishTime ? new Date(nextPublishTime) : undefined,
  };
}
