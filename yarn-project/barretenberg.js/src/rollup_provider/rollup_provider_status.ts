import { EthAddress } from '../address/index.js';
import {
  BlockchainStatus,
  blockchainStatusFromJson,
  BlockchainStatusJson,
  blockchainStatusToJson,
} from '../blockchain/index.js';
import { BridgeConfig } from './bridge_config.js';
import { BridgeStatus, bridgeStatusFromJson, BridgeStatusJson, bridgeStatusToJson } from './bridge_status.js';
import { privacySetsFromJson, privacySetsToJson, PrivacySet, PrivacySetJson } from './privacy_set.js';

export * from './bridge_config.js';
export * from './bridge_status.js';
export * from './privacy_set.js';

export interface RuntimeConfig {
  // A flag specifying if new transactions should be accepted into the tx pool
  acceptingTxs: boolean;
  // Unused
  useKeyCache: boolean;
  // A time period after which a rollup should be published, regardless of the economics of doing so
  publishInterval: number;
  // A time period after which a rollup should be published if no transactions have been received, only used for test environments
  flushAfterIdle: number;
  // An upper limit on the amount of gas that a single rollup transaction should consume
  gasLimit: number;
  // The amount of gas consumed by executing the verification step of the rollup transaction
  verificationGas: number;
  // An upper limit on the gas price used for providing fee quotes to users
  maxFeeGasPrice: bigint;
  // A gas price multiplier to use when producing fee quotes, allowing for rollup provider 'markup'
  feeGasPriceMultiplier: number;
  // The number of significant figures to which fee quotes should be rounded up. Increases privacy by making fees adopt more discreet values
  feeRoundUpSignificantFigures: number;
  // The maximum base gas price that will be accepted when publishing rollups
  maxFeePerGas: bigint;
  // The maximum priority gas price that will be accepted when publishing rollups
  maxPriorityFeePerGas: bigint;
  // The maximum number of pending transactions in the system (new transactions will be rejected once this limit is reached)
  maxUnsettledTxs: number;
  // Unused
  defaultDeFiBatchSize: number;
  // The current set of bridge configurations
  bridgeConfigs: BridgeConfig[];
  // The id values of assets that the rollup provider will accept for the payment of fees
  feePayingAssetIds: number[];
  // Current example privacy sets for client display
  privacySets: { [key: number]: PrivacySet[] };
  // Address of the fee distributor contract
  rollupBeneficiary?: EthAddress;
  // The maximum number of deposits a single IP Address can make within 24 hours
  depositLimit: number;
  // An optional set of addresses from which deposits will not be accepted
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
  bridgeConfigs: BridgeConfig[];
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
  privacySets,
  rollupBeneficiary,
  blacklist,
  ...rest
}: RuntimeConfig): RuntimeConfigJson => ({
  ...rest,
  maxFeeGasPrice: maxFeeGasPrice.toString(),
  maxFeePerGas: maxFeePerGas.toString(),
  maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
  privacySets: privacySetsToJson(privacySets),
  rollupBeneficiary: rollupBeneficiary ? rollupBeneficiary.toLowerCaseAddress() : undefined,
  blacklist: blacklist ? blacklist.map(x => x.toLowerCaseAddress()) : undefined,
});

export const runtimeConfigFromJson = ({
  maxFeeGasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  privacySets,
  rollupBeneficiary,
  blacklist,
  ...rest
}: RuntimeConfigJson): RuntimeConfig => ({
  ...rest,
  maxFeeGasPrice: BigInt(maxFeeGasPrice),
  maxFeePerGas: BigInt(maxFeePerGas),
  maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
  privacySets: privacySetsFromJson(privacySets),
  rollupBeneficiary: rollupBeneficiary ? EthAddress.fromString(rollupBeneficiary) : undefined,
  blacklist: blacklist ? blacklist.map(x => EthAddress.fromString(x)) : undefined,
});

export const partialRuntimeConfigFromJson = ({
  maxFeeGasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  privacySets,
  rollupBeneficiary,
  blacklist,
  ...rest
}: Partial<RuntimeConfigJson>): Partial<RuntimeConfig> => ({
  ...rest,
  ...(maxFeeGasPrice !== undefined ? { maxFeeGasPrice: BigInt(maxFeeGasPrice) } : {}),
  ...(maxFeePerGas !== undefined ? { maxFeePerGas: BigInt(maxFeePerGas) } : {}),
  ...(maxPriorityFeePerGas !== undefined ? { maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas) } : {}),
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
  pendingSecondClassTxCount: number;
  runtimeConfig: RuntimeConfig;
  bridgeStatus: BridgeStatus[];
  proverless: boolean;
  rollupSize: number;
  totalTxs: number;
  totalBlocks: number;
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
  pendingSecondClassTxCount: number;
  runtimeConfig: RuntimeConfigJson;
  bridgeStatus: BridgeStatusJson[];
  proverless: boolean;
  rollupSize: number;
  totalTxs: number;
  totalBlocks: number;
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
