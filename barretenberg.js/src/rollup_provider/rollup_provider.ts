import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { BlockchainStatus } from '../blockchain';
import { BlockSource } from '../block_source';
import { AccountProofData, JoinSplitProofData } from '../client_proofs';
import { OffchainAccountData, OffchainJoinSplitData } from '../offchain_tx_data';
import { TxHash } from '../tx_hash';
import { BridgeStatus } from '../bridge_id';

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
  nextPublishNumber: number;
  pendingTxCount: number;
  bridgeStatus: BridgeStatus[];
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
