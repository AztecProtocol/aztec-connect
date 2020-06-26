import { RollupProviderExplorer, LinkedRollup, RollupStatus, Rollup, Tx } from './rollup_provider_explorer';

export * from './rollup_provider_explorer';

export interface TxResponse {
  txHash: string;
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

export interface RollupResponse {
  id: number;
  status: RollupStatus;
  dataRoot: string;
  nullRoot: string;
  txHashes: string[];
  ethBlock?: number;
  ethTxHash?: string;
  created: Date;
}

const toRollup = (res: RollupResponse): Rollup => ({
  ...res,
  dataRoot: Buffer.from(res.dataRoot, 'hex'),
  nullRoot: Buffer.from(res.nullRoot, 'hex'),
  txHashes: res.txHashes.map(txHash => Buffer.from(txHash, 'hex')),
  ethTxHash: res.ethTxHash ? Buffer.from(res.ethTxHash, 'hex') : undefined,
  created: new Date(res.created),
});

const toTx = (res: TxResponse): Tx => ({
  ...res,
  txHash: Buffer.from(res.txHash, 'hex'),
  merkleRoot: Buffer.from(res.merkleRoot, 'hex'),
  newNote1: Buffer.from(res.newNote1, 'hex'),
  newNote2: Buffer.from(res.newNote2, 'hex'),
  nullifier1: Buffer.from(res.nullifier1, 'hex'),
  nullifier2: Buffer.from(res.nullifier2, 'hex'),
  publicInput: Buffer.from(res.publicInput, 'hex'),
  publicOutput: Buffer.from(res.publicOutput, 'hex'),
  created: new Date(res.created),
});

export class ServerRollupProviderExplorer implements RollupProviderExplorer {
  constructor(private host: URL) {}

  async getLatestRollups(count: number) {
    const url = new URL(`/api/get-rollups`, this.host);
    url.searchParams.append('count', `${count}`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const rollups = (await response.json()) as RollupResponse[];
    return rollups.map(rollupResp => toRollup(rollupResp));
  }

  async getLatestTxs(count: number) {
    const url = new URL(`/api/get-txs`, this.host);
    url.searchParams.append('count', `${count}`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const txs = (await response.json()) as TxResponse[];
    return txs.map(tx => toTx(tx));
  }

  async getRollup(id: number) {
    const url = new URL(`/api/get-rollup`, this.host);
    url.searchParams.append('id', `${id}`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const rollup = await response.json();
    return rollup ? toRollup(rollup) : undefined;
  }

  async getTx(txHash: Buffer) {
    const url = new URL(`/api/get-tx`, this.host);
    url.searchParams.append('txHash', txHash.toString('hex'));

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const tx = await response.json();
    return tx ? toTx(tx) : undefined;
  }
}
