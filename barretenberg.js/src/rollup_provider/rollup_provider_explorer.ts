export type RollupStatus = 'CREATING' | 'CREATED' | 'PUBLISHED' | 'SETTLED';

export interface LinkedRollup {
  id: number;
  status: RollupStatus;
}

export interface TxResponse {
  txId: string;
  rollup?: LinkedRollup;
  merkleRoot: string;
  newNote1: string;
  newNote2: string;
  nullifier1: string;
  nullifier2: string;
  publicInput: string;
  publicOutput: string;
  created: Date;
}

export interface Tx {
  txId: string;
  rollup?: LinkedRollup;
  merkleRoot: string;
  newNote1: string;
  newNote2: string;
  nullifier1: string;
  nullifier2: string;
  publicInput: bigint;
  publicOutput: bigint;
  created: Date;
}

export interface RollupResponse {
  id: number;
  status: RollupStatus;
  dataRoot: string;
  nullRoot: string;
  txIds: string[];
  ethBlock?: number;
  ethTxHash?: string;
  created: Date;
}

export interface Rollup {
  id: number;
  status: RollupStatus;
  dataRoot: string;
  nullRoot: string;
  txIds: string[];
  ethBlock?: number;
  ethTxHash?: string;
  created: Date;
}

const toRollup = (rollupResp: RollupResponse): Rollup => rollupResp;

const toTx = (txResp: TxResponse): Tx => ({
  ...txResp,
  publicInput: BigInt(txResp.publicInput),
  publicOutput: BigInt(txResp.publicOutput),
});

export class RollupProviderExplorer {
  constructor(private host: URL) {}

  async fetchLatestRollups(count: number) {
    const url = new URL(`/api/get-rollups`, this.host);
    url.searchParams.append('count', `${count}`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const rollups = (await response.json()) as RollupResponse[];
    return rollups.map(rollupResp => toRollup(rollupResp));
  }

  async fetchLatestTxs(count: number) {
    const url = new URL(`/api/get-txs`, this.host);
    url.searchParams.append('count', `${count}`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const txs = (await response.json()) as TxResponse[];
    return txs.map(tx => toTx(tx));
  }

  async fetchRollup(id: number) {
    const url = new URL(`/api/get-rollup`, this.host);
    url.searchParams.append('id', `${id}`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const rollup = await response.json();
    return rollup ? toRollup(rollup) : undefined;
  }

  async fetchTxsByTxsIds(txIds: string[]) {
    const url = new URL(`/api/get-txs`, this.host);
    url.searchParams.append('txIds', txIds.join(','));

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const txs = (await response.json()) as TxResponse[];
    return txs.map(tx => toTx(tx));
  }

  async fetchTxByTxId(txId: string) {
    const url = new URL(`/api/get-tx`, this.host);
    url.searchParams.append('txId', txId);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const tx = await response.json();
    return tx ? toTx(tx) : undefined;
  }
}
