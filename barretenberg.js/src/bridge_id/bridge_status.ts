import { BridgeConfig } from './bridge_config';

export interface BridgeStatus {
  bridgeId: bigint;
  numTxs: number;
  gasThreshold: string;
  gasAccrued: string;
  rollupFrequency: number;
  nextRollupNumber?: number;
  nextPublishTime?: Date;
}

export function bridgeStatusToJson(status: BridgeStatus) {
  return {
    ...status,
    bridgeId: status.bridgeId.toString(),
  };
}

export function bridgeStatusFromJson(status: any): BridgeStatus {
  return {
    ...status,
    bridgeId: BigInt(status.bridgeId),
    nextPublishTime: status.nextPublishTime ? new Date(status.nextPublishTime) : undefined,
  };
}

export function convertToBridgeStatus(
  bridgeConfig: BridgeConfig,
  rollupNumber: number | undefined,
  publishTime: Date | undefined,
  gasAccrued: bigint,
  gasThreshold: bigint,
) {
  return {
    bridgeId: bridgeConfig.bridgeId,
    numTxs: bridgeConfig.numTxs,
    gasThreshold: gasThreshold.toString(),
    gasAccrued: gasAccrued.toString(),
    rollupFrequency: bridgeConfig.rollupFrequency,
    nextRollupNumber: rollupNumber,
    nextPublishTime: publishTime,
  } as BridgeStatus;
}
