import { BlockSource } from '../block_source';
import { TxHash } from '../tx_hash';
import { BlockchainStatus } from '../blockchain';
import { ViewingKey } from '../viewing_key';

export interface Proof {
  proofData: Buffer;
  viewingKeys: ViewingKey[];
  depositSignature?: Buffer;
}
export interface FeeQuote {
  fee: bigint;
  time: number;
}
export interface AssetFeeQuote {
  feeConstants: bigint[];
  baseFeeQuotes: FeeQuote[];
}
export enum SettlementTime {
  SLOW,
  AVERAGE,
  FAST,
  INSTANT,
}

export interface RollupProviderStatus {
  blockchainStatus: BlockchainStatus;
  txFees: AssetFeeQuote[];
  nextPublishTime: Date;
  pendingTxCount: number;
}

export interface RollupProvider extends BlockSource {
  sendProof(proof: Proof): Promise<TxHash>;
  getStatus(): Promise<RollupProviderStatus>;
  getPendingNoteNullifiers: () => Promise<Buffer[]>;
}
