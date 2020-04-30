export interface Block {
  blockNum: number;
  dataStartIndex: number;
  dataEntries: Buffer[];
  nullifiers: Buffer[];
}

export interface BlockSource {
  on(event: 'block', fn: (block: Block) => void);
  removeAllListeners();
}