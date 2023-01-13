export interface Block {
  id: number;
  hash: string;
  numTxs: number;
  ethTxHash?: string;
  mined: Date;
}

export interface BlocksQueryData {
  blocks: Block[];
}

export interface BlocksQueryVars {
  take: number;
  skip: number;
}
