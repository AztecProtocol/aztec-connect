import { BridgeConfig } from './bridge_config';
import { BridgeId } from '.';

export interface BridgeStatus {
  bridgeId: string;
  numTxs: number;
  gas: string;
  rollupFrequency: number;
  nextRollupNumber: number | undefined;
  nextPublishTime: Date | undefined;
}

export function convertToBridgeStatus(
  bridgeConfig: BridgeConfig,
  rollupNumber: number | undefined,
  publishTime: Date | undefined,
) {
  return {
    bridgeId: bridgeConfig.bridgeId.toString(),
    numTxs: bridgeConfig.numTxs,
    gas: bridgeConfig.fee.toString(),
    rollupFrequency: bridgeConfig.rollupFrequency,
    nextRollupNumber: rollupNumber,
    nextPublishTime: publishTime,
  } as BridgeStatus;
}

export function convertToBridgeConfig(bridgeConfiguration: BridgeStatus) {
  return {
    bridgeId: BridgeId.fromString(bridgeConfiguration.bridgeId),
    numTxs: bridgeConfiguration.numTxs,
    fee: BigInt(bridgeConfiguration.gas),
    rollupFrequency: bridgeConfiguration.rollupFrequency,
  } as BridgeConfig;
}
