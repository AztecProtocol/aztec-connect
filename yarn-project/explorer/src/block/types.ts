export interface Tx {
  id: string;
  proofId: number;
}

export interface Block {
  id: number;
  hash: string;
  dataRoot: string;
  txs: Tx[];
  proofData?: string;
  nullifierRoot?: string;
  ethTxHash?: string;
  mined: Date;
}

export interface BlockQueryData {
  block: Block;
}

export interface BlockQueryVars {
  id: number;
}
