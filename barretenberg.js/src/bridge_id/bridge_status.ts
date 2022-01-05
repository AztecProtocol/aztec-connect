import { BridgeConfig } from './bridge_config';

export interface BridgeStatus {
  bridgeId: bigint;
  numTxs: number;
  gas: string;
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

export function convertToBridgeStatus(bridgeConfig: BridgeConfig, rollupNumber?: number, publishTime?: Date) {
  return {
    bridgeId: bridgeConfig.bridgeId,
    numTxs: bridgeConfig.numTxs,
    gas: bridgeConfig.fee.toString(),
    rollupFrequency: bridgeConfig.rollupFrequency,
    nextRollupNumber: rollupNumber,
    nextPublishTime: publishTime,
  } as BridgeStatus;
}

export function convertToBridgeConfig(bridgeConfiguration: BridgeStatus) {
  return {
    bridgeId: bridgeConfiguration.bridgeId,
    numTxs: bridgeConfiguration.numTxs,
    fee: BigInt(bridgeConfiguration.gas),
    rollupFrequency: bridgeConfiguration.rollupFrequency,
  } as BridgeConfig;
}
