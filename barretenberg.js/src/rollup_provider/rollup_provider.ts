import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { AssetValue } from '../asset';
import { BlockchainStatus, blockchainStatusFromJson, blockchainStatusToJson } from '../blockchain';
import { BlockSource } from '../block_source';
import { BridgeId, BridgeStatus, bridgeStatusFromJson, bridgeStatusToJson } from '../bridge_id';
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

export interface TxJson {
  proofData: string;
  offchainTxData: string;
  depositSignature?: string;
}

export const txToJson = ({ proofData, offchainTxData, depositSignature }: Tx): TxJson => ({
  proofData: proofData.toString('hex'),
  offchainTxData: offchainTxData.toString('hex'),
  depositSignature: depositSignature ? depositSignature.toString('hex') : undefined,
});

export const txFromJson = ({ proofData, offchainTxData, depositSignature }: TxJson): Tx => ({
  proofData: Buffer.from(proofData, 'hex'),
  offchainTxData: Buffer.from(offchainTxData, 'hex'),
  depositSignature: depositSignature ? Buffer.from(depositSignature, 'hex') : undefined,
});

export interface RuntimeConfig {
  acceptingTxs: boolean;
  useKeyCache: boolean;
  publishInterval: number;
  flushAfterIdle: number;
  gasLimit: number;
  baseTxGas: number;
  verificationGas: number;
  maxFeeGasPrice: bigint;
  feeGasPriceMultiplier: number;
  feeRoundUpSignificantFigures: number;
  maxProviderGasPrice: bigint;
  maxUnsettledTxs: number;
  defaultDeFiBatchSize: number;
}

export function runtimeConfigToJson(runtimeConfig: RuntimeConfig) {
  return {
    ...runtimeConfig,
    maxFeeGasPrice: runtimeConfig.maxFeeGasPrice.toString(),
    maxProviderGasPrice: runtimeConfig.maxProviderGasPrice.toString(),
  };
}

export function runtimeConfigFromJson(runtimeConfig: any) {
  const { maxFeeGasPrice, maxProviderGasPrice } = runtimeConfig;
  return {
    ...runtimeConfig,
    ...(maxFeeGasPrice !== undefined ? { maxFeeGasPrice: BigInt(maxFeeGasPrice) } : {}),
    ...(maxProviderGasPrice !== undefined ? { maxProviderGasPrice: BigInt(maxProviderGasPrice) } : {}),
  };
}

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

export function rollupProviderStatusToJson(status: RollupProviderStatus) {
  return {
    ...status,
    blockchainStatus: blockchainStatusToJson(status.blockchainStatus),
    bridgeStatus: status.bridgeStatus.map(bridgeStatusToJson),
    runtimeConfig: runtimeConfigToJson(status.runtimeConfig),
  };
}

export function rollupProviderStatusFromJson(status: any): RollupProviderStatus {
  const { blockchainStatus, nextPublishTime, runtimeConfig, bridgeStatus, ...rest } = status;
  return {
    ...rest,
    blockchainStatus: blockchainStatusFromJson(blockchainStatus),
    nextPublishTime: new Date(nextPublishTime),
    runtimeConfig: runtimeConfigFromJson(runtimeConfig),
    bridgeStatus: bridgeStatus.map(bridgeStatusFromJson),
  };
}

export interface PendingTx {
  txId: TxId;
  noteCommitment1: Buffer;
  noteCommitment2: Buffer;
}

export interface PendingTxJson {
  txId: string;
  noteCommitment1: string;
  noteCommitment2: string;
}

export const pendingTxToJson = ({ txId, noteCommitment1, noteCommitment2 }: PendingTx): PendingTxJson => ({
  txId: txId.toString(),
  noteCommitment1: noteCommitment1.toString('hex'),
  noteCommitment2: noteCommitment2.toString('hex'),
});

export const pendingTxFromJson = ({ txId, noteCommitment1, noteCommitment2 }: PendingTxJson): PendingTx => ({
  txId: TxId.fromString(txId),
  noteCommitment1: Buffer.from(noteCommitment1, 'hex'),
  noteCommitment2: Buffer.from(noteCommitment2, 'hex'),
});

export interface InitialWorldState {
  initialAccounts: Buffer;
}

export interface AccountTx {
  proofData: AccountProofData;
  offchainTxData: OffchainAccountData;
}

export interface AccountTxJson {
  proofData: string;
  offchainTxData: string;
}

export const accountTxToJson = ({ proofData, offchainTxData }: AccountTx): AccountTxJson => ({
  proofData: proofData.proofData.rawProofData.toString('hex'),
  offchainTxData: offchainTxData.toBuffer().toString('hex'),
});

export const accountTxFromJson = ({ proofData, offchainTxData }: AccountTxJson): AccountTx => ({
  proofData: AccountProofData.fromBuffer(Buffer.from(proofData, 'hex')),
  offchainTxData: OffchainAccountData.fromBuffer(Buffer.from(offchainTxData, 'hex')),
});

export interface JoinSplitTx {
  proofData: JoinSplitProofData;
  offchainTxData: OffchainJoinSplitData;
}

export interface JoinSplitTxJson {
  proofData: string;
  offchainTxData: string;
}

export const joinSplitTxToJson = ({ proofData, offchainTxData }: JoinSplitTx): JoinSplitTxJson => ({
  proofData: proofData.proofData.rawProofData.toString('hex'),
  offchainTxData: offchainTxData.toBuffer().toString('hex'),
});

export const joinSplitTxFromJson = ({ proofData, offchainTxData }: JoinSplitTxJson): JoinSplitTx => ({
  proofData: JoinSplitProofData.fromBuffer(Buffer.from(proofData, 'hex')),
  offchainTxData: OffchainJoinSplitData.fromBuffer(Buffer.from(offchainTxData, 'hex')),
});

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
