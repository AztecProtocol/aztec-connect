import {
  BlockchainStatus,
  blockchainStatusFromJson,
  BlockchainStatusJson,
  blockchainStatusToJson,
} from '../blockchain';
import { BridgeConfig, bridgeConfigFromJson, BridgeConfigJson, bridgeConfigToJson } from './bridge_config';
import { BridgeStatus, bridgeStatusFromJson, BridgeStatusJson, bridgeStatusToJson } from './bridge_status';

export * from './bridge_config';
export * from './bridge_status';

export interface RuntimeConfig {
  acceptingTxs: boolean;
  useKeyCache: boolean;
  publishInterval: number;
  flushAfterIdle: number;
  gasLimit: number;
  verificationGas: number;
  maxFeeGasPrice: bigint;
  feeGasPriceMultiplier: number;
  feeRoundUpSignificantFigures: number;
  maxProviderGasPrice: bigint;
  maxUnsettledTxs: number;
  defaultDeFiBatchSize: number;
  bridgeConfigs: BridgeConfig[];
  feePayingAssetIds: number[];
}

export interface RuntimeConfigJson {
  acceptingTxs: boolean;
  useKeyCache: boolean;
  publishInterval: number;
  flushAfterIdle: number;
  gasLimit: number;
  verificationGas: number;
  maxFeeGasPrice: string;
  feeGasPriceMultiplier: number;
  feeRoundUpSignificantFigures: number;
  maxProviderGasPrice: string;
  maxUnsettledTxs: number;
  defaultDeFiBatchSize: number;
  bridgeConfigs: BridgeConfigJson[];
  feePayingAssetIds: number[];
}

export const runtimeConfigToJson = ({
  maxFeeGasPrice,
  maxProviderGasPrice,
  bridgeConfigs,
  ...rest
}: RuntimeConfig): RuntimeConfigJson => ({
  ...rest,
  maxFeeGasPrice: maxFeeGasPrice.toString(),
  maxProviderGasPrice: maxProviderGasPrice.toString(),
  bridgeConfigs: bridgeConfigs.map(bridgeConfigToJson),
});

export const runtimeConfigFromJson = ({
  maxFeeGasPrice,
  maxProviderGasPrice,
  bridgeConfigs,
  ...rest
}: RuntimeConfigJson): RuntimeConfig => ({
  ...rest,
  maxFeeGasPrice: BigInt(maxFeeGasPrice),
  maxProviderGasPrice: BigInt(maxProviderGasPrice),
  bridgeConfigs: bridgeConfigs.map(bridgeConfigFromJson),
});

export const partialRuntimeConfigFromJson = ({
  maxFeeGasPrice,
  maxProviderGasPrice,
  bridgeConfigs,
  ...rest
}: Partial<RuntimeConfigJson>): Partial<RuntimeConfig> => ({
  ...rest,
  ...(maxFeeGasPrice !== undefined ? { maxFeeGasPrice: BigInt(maxFeeGasPrice) } : {}),
  ...(maxProviderGasPrice !== undefined ? { maxProviderGasPrice: BigInt(maxProviderGasPrice) } : {}),
  ...(bridgeConfigs ? { bridgeConfigs: bridgeConfigs.map(bridgeConfigFromJson) } : {}),
});

export interface RollupProviderStatus {
  blockchainStatus: BlockchainStatus;
  nextPublishTime: Date;
  nextPublishNumber: number;
  numTxsPerRollup: number;
  numTxsInNextRollup: number;
  numUnsettledTxs: number;
  pendingTxCount: number;
  runtimeConfig: RuntimeConfig;
  bridgeStatus: BridgeStatus[];
  proverless: boolean;
  rollupSize: number;
}

export interface RollupProviderStatusJson {
  blockchainStatus: BlockchainStatusJson;
  nextPublishTime: string;
  nextPublishNumber: number;
  numTxsPerRollup: number;
  numTxsInNextRollup: number;
  numUnsettledTxs: number;
  pendingTxCount: number;
  runtimeConfig: RuntimeConfigJson;
  bridgeStatus: BridgeStatusJson[];
  proverless: boolean;
  rollupSize: number;
}

export const rollupProviderStatusToJson = ({
  blockchainStatus,
  nextPublishTime,
  runtimeConfig,
  bridgeStatus,
  ...rest
}: RollupProviderStatus): RollupProviderStatusJson => ({
  ...rest,
  blockchainStatus: blockchainStatusToJson(blockchainStatus),
  nextPublishTime: nextPublishTime.toISOString(),
  runtimeConfig: runtimeConfigToJson(runtimeConfig),
  bridgeStatus: bridgeStatus.map(bridgeStatusToJson),
});

export const rollupProviderStatusFromJson = ({
  blockchainStatus,
  nextPublishTime,
  runtimeConfig,
  bridgeStatus,
  ...rest
}: RollupProviderStatusJson): RollupProviderStatus => ({
  ...rest,
  blockchainStatus: blockchainStatusFromJson(blockchainStatus),
  nextPublishTime: new Date(nextPublishTime),
  runtimeConfig: runtimeConfigFromJson(runtimeConfig),
  bridgeStatus: bridgeStatus.map(bridgeStatusFromJson),
});
