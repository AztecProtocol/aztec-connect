import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { AssetValue } from '../asset';
import { BlockchainStatus, blockchainStatusFromJson, blockchainStatusToJson } from '../blockchain';
import { BlockSource } from '../block_source';
import { BridgeId, BridgeStatus, bridgeStatusToJson } from '../bridge_id';
import { AccountProofData, JoinSplitProofData } from '../client_proofs';
import { OffchainAccountData, OffchainJoinSplitData } from '../offchain_tx_data';
import { TxId } from '../tx_id';

export enum TxSettlementTime {
  NEXT_ROLLUP,
  INSTANT,
}

export enum DefiSettlementTime {
  DEADLINE,
  NEXT_ROLLUP,
  INSTANT,
}

export interface Tx {
  proofData: Buffer;
  offchainTxData: Buffer;
  depositSignature?: Buffer;
}

export interface RuntimeConfig {
  acceptingTxs: boolean;
  useKeyCache: boolean;
  publishInterval: number;
  gasLimit: number;
  baseTxGas: number;
  verificationGas: number;
  maxFeeGasPrice: bigint;
  feeGasPriceMultiplier: number;
  maxProviderGasPrice: bigint;
  maxUnsettledTxs: number;
}

export function runtimeConfigToJson(runtimeConfig: RuntimeConfig) {
  return {
    ...runtimeConfig,
    maxFeeGasPrice: runtimeConfig.maxFeeGasPrice.toString(),
    maxProviderGasPrice: runtimeConfig.maxProviderGasPrice.toString(),
  };
}

export function runtimeConfigFromJson(runtimeConfig: any) {
  return {
    ...runtimeConfig,
    maxFeeGasPrice: BigInt(runtimeConfig.maxFeeGasPrice),
    maxProviderGasPrice: BigInt(runtimeConfig.maxProviderGasPrice),
  };
}

export interface RollupProviderStatus {
  blockchainStatus: BlockchainStatus;
  nextPublishTime: Date;
  nextPublishNumber: number;
  pendingTxCount: number;
  runtimeConfig: RuntimeConfig;
  bridgeStatus: BridgeStatus[];
  proverless: boolean,
}

export function rollupProviderStatusToJson(status: RollupProviderStatus) {
  return {
    ...status,
    blockchainStatus: blockchainStatusToJson(status.blockchainStatus),
    bridgeStatus: status.bridgeStatus.map(bridgeStatusToJson),
    runtimeConfig: runtimeConfigToJson(status.runtimeConfig),
  };
}

export function rollupProviderStatusFromJson(status: any): RollupProviderStatus {
  const { blockchainStatus, nextPublishTime, runtimeConfig, ...rest } = status;
  return {
    ...rest,
    blockchainStatus: blockchainStatusFromJson(blockchainStatus),
    nextPublishTime: new Date(nextPublishTime),
    runtimeConfig: runtimeConfigFromJson(runtimeConfig),
  };
}

export interface PendingTx {
  txId: TxId;
  noteCommitment1: Buffer;
  noteCommitment2: Buffer;
}

export interface InitialWorldState {
  initialAccounts: Buffer;
}

export interface AccountTx {
  proofData: AccountProofData;
  offchainData: OffchainAccountData;
}

export interface JoinSplitTx {
  proofData: JoinSplitProofData;
  offchainData: OffchainJoinSplitData;
}

export interface RollupProvider extends BlockSource {
  sendTxs(txs: Tx[]): Promise<TxId[]>;
  getStatus(): Promise<RollupProviderStatus>;
  getTxFees(assetId: number): Promise<AssetValue[][]>;
  getDefiFees(bridgeId: BridgeId): Promise<AssetValue[]>;
  getPendingTxs: () => Promise<PendingTx[]>;
  getPendingNoteNullifiers: () => Promise<Buffer[]>;
  clientLog: (msg: any) => Promise<void>;
  getInitialWorldState(): Promise<InitialWorldState>;
  getLatestAccountNonce(accountPubKey: GrumpkinAddress): Promise<number>;
  getLatestAliasNonce(alias: string): Promise<number>;
  getAccountId(alias: string, nonce?: number): Promise<AccountId | undefined>;
  getUnsettledAccountTxs: () => Promise<AccountTx[]>;
  getUnsettledPaymentTxs: () => Promise<JoinSplitTx[]>;
}
