import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { AssetValue } from '../asset';
import { BlockSource } from '../block_source';
import { BridgeId } from '../bridge_id';
import { AccountProofData, JoinSplitProofData } from '../client_proofs';
import { OffchainAccountData, OffchainJoinSplitData } from '../offchain_tx_data';
import { TxId } from '../tx_id';
import { RollupProviderStatus } from './rollup_provider_status';

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
  getAccountId(alias: string, accountNonce?: number): Promise<AccountId | undefined>;
  getUnsettledAccountTxs: () => Promise<AccountTx[]>;
  getUnsettledPaymentTxs: () => Promise<JoinSplitTx[]>;
}
