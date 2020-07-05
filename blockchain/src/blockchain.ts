import { Block, BlockSource } from 'barretenberg/block_source';

export { Block } from 'barretenberg/block_source';

export interface ProofReceiver {
  sendProof(proof: Buffer, viewingKeys: Buffer[], rollupSize: number): Promise<Buffer>;
}

export interface Receipt {
  blockNum: number;
}

export interface Blockchain extends BlockSource, ProofReceiver {
  getBlocks(from: number): Promise<Block[]>;
  getTransactionReceipt(txHash: Buffer): Promise<Receipt>;
  validateDepositFunds(publicOwner: Buffer, publicInput: Buffer): Promise<boolean>;
  getRollupContractAddress(): string;
  getTokenContractAddress(): string;
}
