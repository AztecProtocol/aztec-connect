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
    bridgeId: bridgeId.toString(),
    nextPublishTime: nextPublishTime?.toISOString(),
  };
}

export function bridgeStatusFromJson({ bridgeId, nextPublishTime, ...rest }: BridgeStatusJson): BridgeStatus {
  return {
    ...rest,
    bridgeId: BigInt(bridgeId),
    nextPublishTime: nextPublishTime ? new Date(nextPublishTime) : undefined,
  };
}
