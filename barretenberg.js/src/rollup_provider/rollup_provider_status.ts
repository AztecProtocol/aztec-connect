import { EthAddress } from '../address';
import {
  BlockchainStatus,
  blockchainStatusFromJson,
  BlockchainStatusJson,
  blockchainStatusToJson,
} from '../blockchain';
import { BridgeConfig, bridgeConfigFromJson, BridgeConfigJson, bridgeConfigToJson } from './bridge_config';
import { BridgeStatus, bridgeStatusFromJson, BridgeStatusJson, bridgeStatusToJson } from './bridge_status';
import { privacySetsFromJson, privacySetsToJson, PrivacySet, PrivacySetJson } from './privacy_set';

export * from './bridge_config';
export * from './bridge_status';
export * from './privacy_set';

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
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  maxUnsettledTxs: number;
  defaultDeFiBatchSize: number;
  bridgeConfigs: BridgeConfig[];
  feePayingAssetIds: number[];
  privacySets: { [key: number]: PrivacySet[] };
  rollupBeneficiary?: EthAddress;
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
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  maxUnsettledTxs: number;
  defaultDeFiBatchSize: number;
  bridgeConfigs: BridgeConfigJson[];
  feePayingAssetIds: number[];
  privacySets: { [key: string]: PrivacySetJson[] };
  rollupBeneficiary?: string;
}

export const runtimeConfigToJson = ({
  maxFeeGasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  bridgeConfigs,
  privacySets,
  rollupBeneficiary,
  ...rest
}: RuntimeConfig): RuntimeConfigJson => ({
  ...rest,
  maxFeeGasPrice: maxFeeGasPrice.toString(),
  maxFeePerGas: maxFeePerGas.toString(),
  maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
  bridgeConfigs: bridgeConfigs.map(bridgeConfigToJson),
  privacySets: privacySetsToJson(privacySets),
  rollupBeneficiary: rollupBeneficiary ? rollupBeneficiary.toString() : undefined,
});

export const runtimeConfigFromJson = ({
  maxFeeGasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  bridgeConfigs,
  privacySets,
  rollupBeneficiary,
  ...rest
}: RuntimeConfigJson): RuntimeConfig => ({
  ...rest,
  maxFeeGasPrice: BigInt(maxFeeGasPrice),
  maxFeePerGas: BigInt(maxFeePerGas),
  maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
  bridgeConfigs: bridgeConfigs.map(bridgeConfigFromJson),
  privacySets: privacySetsFromJson(privacySets),
  rollupBeneficiary: rollupBeneficiary ? EthAddress.fromString(rollupBeneficiary) : undefined,
});

export const partialRuntimeConfigFromJson = ({
  maxFeeGasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  bridgeConfigs,
  privacySets,
  rollupBeneficiary,
  ...rest
}: Partial<RuntimeConfigJson>): Partial<RuntimeConfig> => ({
  ...rest,
  ...(maxFeeGasPrice !== undefined ? { maxFeeGasPrice: BigInt(maxFeeGasPrice) } : {}),
  ...(maxFeePerGas !== undefined ? { maxFeePerGas: BigInt(maxFeePerGas) } : {}),
  ...(maxPriorityFeePerGas !== undefined ? { maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas) } : {}),
  ...(bridgeConfigs ? { bridgeConfigs: bridgeConfigs.map(bridgeConfigFromJson) } : {}),
  ...(privacySets ? { privacySets: privacySetsFromJson(privacySets) } : {}),
  ...(rollupBeneficiary ? { rollupBeneficiary: EthAddress.fromString(rollupBeneficiary) } : {}),
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
