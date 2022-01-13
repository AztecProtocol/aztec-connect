import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { BlockchainStatus, blockchainStatusFromJson, blockchainStatusToJson } from '../blockchain';
import { BlockSource } from '../block_source';
import { AccountProofData, JoinSplitProofData } from '../client_proofs';
import { OffchainAccountData, OffchainJoinSplitData } from '../offchain_tx_data';
import { TxHash } from '../tx_hash';
import { BridgeStatus, bridgeStatusToJson } from '../bridge_id';

export enum SettlementTime {
  SLOW,
  AVERAGE,
  FAST,
  INSTANT,
}

export interface Proof {
  proofData: Buffer;
  offchainTxData: Buffer;
  depositSignature?: Buffer;
  parentProof?: Proof;
}

export interface FeeQuote {
  fee: bigint;
  time: SettlementTime;
}

export interface AssetFeeQuote {
  feeConstants: bigint[];
  baseFeeQuotes: FeeQuote[];
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
  txFees: AssetFeeQuote[];
  nextPublishTime: Date;
  nextPublishNumber: number;
  pendingTxCount: number;
  runtimeConfig: RuntimeConfig;
  bridgeStatus: BridgeStatus[];
}

export function rollupProviderStatusToJson(status: RollupProviderStatus) {
  return {
    ...status,
    blockchainStatus: blockchainStatusToJson(status.blockchainStatus),
    txFees: status.txFees.map(({ feeConstants, baseFeeQuotes }) => ({
      feeConstants: feeConstants.map(constant => constant.toString()),
      baseFeeQuotes: baseFeeQuotes.map(({ fee, time }) => ({
        time,
        fee: fee.toString(),
      })),
    })),
    bridgeStatus: status.bridgeStatus.map(bridgeStatusToJson),
    runtimeConfig: runtimeConfigToJson(status.runtimeConfig),
  };
}

export function rollupProviderStatusFromJson(status: any): RollupProviderStatus {
  const { txFees, blockchainStatus, nextPublishTime, runtimeConfig, ...rest } = status;
  return {
    ...rest,
    blockchainStatus: blockchainStatusFromJson(blockchainStatus),
    txFees: txFees.map(({ feeConstants, baseFeeQuotes }) => ({
      feeConstants: feeConstants.map(r => BigInt(r)),
      baseFeeQuotes: baseFeeQuotes.map(({ fee, time }) => ({
        time,
        fee: BigInt(fee),
      })),
    })),
    nextPublishTime: new Date(nextPublishTime),
    runtimeConfig: runtimeConfigFromJson(runtimeConfig),
  };
}

export interface PendingTx {
  txId: TxHash;
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
  sendProof(proof: Proof): Promise<TxHash>;
  getStatus(): Promise<RollupProviderStatus>;
  getPendingTxs: () => Promise<PendingTx[]>;
  getPendingNoteNullifiers: () => Promise<Buffer[]>;
  clientLog: (msg: any) => Promise<void>;
  getInitialWorldState(): Promise<InitialWorldState>;
  getLatestAccountNonce(accountPubKey: GrumpkinAddress): Promise<number>;
  getLatestAliasNonce(alias: string): Promise<number>;
  getAccountId(alias: string, nonce?: number): Promise<AccountId | undefined>;
  getUnsettledAccountTxs: () => Promise<AccountTx[]>;
  getUnsettledJoinSplitTxs: () => Promise<JoinSplitTx[]>;
}
