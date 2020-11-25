import { TxHash } from './tx_hash';

export type RollupStatus = 'CREATING' | 'CREATED' | 'PUBLISHED' | 'SETTLED';

export interface LinkedRollup {
  id: number;
  status: RollupStatus;
}

export interface Tx {
  txHash: TxHash;
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
  txHashes: TxHash[];
  proofData?: Buffer;
  ethBlock?: number;
  ethTxHash?: TxHash;
  created: Date;
}

export interface RollupProviderExplorer {
  getLatestRollups(count: number): Promise<Rollup[]>;

  getLatestTxs(count: number): Promise<Tx[]>;

  getRollup(id: number): Promise<Rollup | undefined>;

  getTx(txHash: TxHash): Promise<Tx | undefined>;
}
