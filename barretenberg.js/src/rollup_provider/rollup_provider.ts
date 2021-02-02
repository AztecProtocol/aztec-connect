import { BlockSource } from '../block_source';
import { TxHash } from '../tx_hash';
import { BlockchainStatus } from '../blockchain';
import { ViewingKey } from '../viewing_key';

export interface Proof {
  proofData: Buffer;
  viewingKeys: ViewingKey[];
  depositSignature?: Buffer;
}

export interface RollupProviderStatus {
  blockchainStatus: BlockchainStatus;
  minFees: bigint[];
}

export interface RollupProvider extends BlockSource {
  sendProof(proof: Proof): Promise<TxHash>;
  getStatus(): Promise<RollupProviderStatus>;
  getPendingNoteNullifiers: () => Promise<Buffer[]>;
}
