export type RollupStatus = 'CREATING' | 'CREATED' | 'PUBLISHED' | 'SETTLED';

export interface LinkedRollup {
  id: number;
  status: RollupStatus;
}

export interface Tx {
  txHash: Buffer;
  rollup?: LinkedRollup;
  merkleRoot: Buffer;
  newNote1: Buffer;
  newNote2: Buffer;
  nullifier1: Buffer;
  nullifier2: Buffer;
  publicInput: Buffer;
  publicOutput: Buffer;
  created: Date;
}

export interface Rollup {
  id: number;
  status: RollupStatus;
  dataRoot: Buffer;
  nullRoot: Buffer;
  txHashes: Buffer[];
  ethBlock?: number;
  ethTxHash?: Buffer;
  created: Date;
}

export interface RollupProviderExplorer {
  getLatestRollups(count: number): Promise<Rollup[]>;

  getLatestTxs(count: number): Promise<Tx[]>;

  getRollup(id: number): Promise<Rollup | undefined>;

  getTx(txHash: Buffer): Promise<Tx | undefined>;
}
