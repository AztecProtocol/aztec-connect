export interface Block {
  blockNum: number;
  txHash: Buffer;
  created: Date;
  rollupSize: number;
  rollupProofData: Buffer;
  viewingKeysData: Buffer;
}

export interface BlockServerResponse {
  blockNum: number;
  txHash: string;
  created: string;
  rollupSize: number;
  rollupProofData: string;
  viewingKeysData: string;
}

export interface BlockSource {
  getBlocks(from: number): Promise<Block[]>;
  on(event: 'block', fn: (block: Block) => void);
  removeAllListeners();
  start(fromBlock?: number);
  stop();
}

export * from './server_block_source';
