export interface Block {
  id: number;
  hash: string;
  numTxs: number;
  ethTxHash?: string;
  created: Date;
  mined?: Date;
}

export interface BlocksQueryData {
  blocks: Block[];
}

export interface BlocksQueryVars {
  take: number;
  skip: number;
}
