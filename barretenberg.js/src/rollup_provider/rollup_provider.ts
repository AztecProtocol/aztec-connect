import { BlockSource } from '../block_source';
import { TxHash } from '../tx_hash';
import { BlockchainStatus } from '../blockchain';

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
}

export interface FeeQuote {
  fee: bigint;
  time: SettlementTime;
}

export interface AssetFeeQuote {
  feeConstants: bigint[];
  baseFeeQuotes: FeeQuote[];
}

export interface RollupProviderStatus {
  blockchainStatus: BlockchainStatus;
  txFees: AssetFeeQuote[];
  nextPublishTime: Date;
  pendingTxCount: number;
}

export interface PendingTx {
  txId: TxHash;
  noteCommitment1: Buffer;
  noteCommitment2: Buffer;
}

export interface InitialWorldState {
  initialAccounts: Buffer;
}

export interface RollupProvider extends BlockSource {
  sendProof(proof: Proof): Promise<TxHash>;
  getStatus(): Promise<RollupProviderStatus>;
  getPendingTxs: () => Promise<PendingTx[]>;
  getPendingNoteNullifiers: () => Promise<Buffer[]>;
  clientLog: (msg: any) => Promise<void>;
  getInitialWorldState(): Promise<InitialWorldState>;
}
