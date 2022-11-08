import { EthAddress } from '../address/index.js';
import {
  BlockchainStatus,
  blockchainStatusFromJson,
  BlockchainStatusJson,
  blockchainStatusToJson,
} from '../blockchain/index.js';
import { BridgeConfig, bridgeConfigFromJson, BridgeConfigJson, bridgeConfigToJson } from './bridge_config.js';
import { BridgeStatus, bridgeStatusFromJson, BridgeStatusJson, bridgeStatusToJson } from './bridge_status.js';
import { privacySetsFromJson, privacySetsToJson, PrivacySet, PrivacySetJson } from './privacy_set.js';

export * from './bridge_config.js';
export * from './bridge_status.js';
export * from './privacy_set.js';

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
  depositLimit: number;
  blacklist?: EthAddress[];
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
  depositLimit: number;
  blacklist?: string[];
}

export const runtimeConfigToJson = ({
  maxFeeGasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  bridgeConfigs,
  privacySets,
  rollupBeneficiary,
  blacklist,
  ...rest
}: RuntimeConfig): RuntimeConfigJson => ({
  ...rest,
  maxFeeGasPrice: maxFeeGasPrice.toString(),
  maxFeePerGas: maxFeePerGas.toString(),
  maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
  bridgeConfigs: bridgeConfigs.map(bridgeConfigToJson),
  privacySets: privacySetsToJson(privacySets),
  rollupBeneficiary: rollupBeneficiary ? rollupBeneficiary.toString() : undefined,
  blacklist: blacklist ? blacklist.map(x => x.toString()) : undefined,
});

export const runtimeConfigFromJson = ({
  maxFeeGasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  bridgeConfigs,
  privacySets,
  rollupBeneficiary,
  blacklist,
  ...rest
}: RuntimeConfigJson): RuntimeConfig => ({
  ...rest,
  maxFeeGasPrice: BigInt(maxFeeGasPrice),
  maxFeePerGas: BigInt(maxFeePerGas),
  maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
  bridgeConfigs: bridgeConfigs.map(bridgeConfigFromJson),
  privacySets: privacySetsFromJson(privacySets),
  rollupBeneficiary: rollupBeneficiary ? EthAddress.fromString(rollupBeneficiary) : undefined,
  blacklist: blacklist ? blacklist.map(x => EthAddress.fromString(x)) : undefined,
});

export const partialRuntimeConfigFromJson = ({
  maxFeeGasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  bridgeConfigs,
  privacySets,
  rollupBeneficiary,
  blacklist,
  ...rest
}: Partial<RuntimeConfigJson>): Partial<RuntimeConfig> => ({
  ...rest,
  ...(maxFeeGasPrice !== undefined ? { maxFeeGasPrice: BigInt(maxFeeGasPrice) } : {}),
  ...(maxFeePerGas !== undefined ? { maxFeePerGas: BigInt(maxFeePerGas) } : {}),
  ...(maxPriorityFeePerGas !== undefined ? { maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas) } : {}),
  ...(bridgeConfigs ? { bridgeConfigs: bridgeConfigs.map(bridgeConfigFromJson) } : {}),
  ...(privacySets ? { privacySets: privacySetsFromJson(privacySets) } : {}),
  ...(rollupBeneficiary ? { rollupBeneficiary: EthAddress.fromString(rollupBeneficiary) } : {}),
  ...(blacklist ? { blacklist: blacklist.map(x => EthAddress.fromString(x)) } : {}),
});

export interface RollupProviderStatus {
  version: string;
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
  version: string;
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
