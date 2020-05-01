export interface Block {
  blockNum: number;
  rollupId: number;
  dataStartIndex: number;
  dataEntries: Buffer[];
  nullifiers: Buffer[];
  viewingKeys: Buffer[];
}

export interface BlockSource {
  on(event: 'block', fn: (block: Block) => void);
  removeAllListeners();
}
