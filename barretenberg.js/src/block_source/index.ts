export interface Block {
  txHash: Buffer;
  blockNum: number;
  rollupId: number;
  dataStartIndex: number;
  numDataEntries: number;
  dataEntries: Buffer[];
  nullifiers: Buffer[];
  viewingKeys: Buffer[];
}

export interface BlockSource {
  on(event: 'block', fn: (block: Block) => void);
  removeAllListeners();
  start(fromBlock?: number);
  stop();
}

export * from './server_block_source';
