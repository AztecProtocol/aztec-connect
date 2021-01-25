import { ProofData } from '../client_proofs/proof_data';
import { RollupProviderExplorer, Rollup, Tx, RollupStatus, LinkedRollup } from './rollup_provider_explorer';
import { TxHash } from '../tx_hash';

export * from './rollup_provider_explorer';

export interface RollupServerResponse {
  id: number;
  status: RollupStatus;
  dataRoot: string;
  txHashes: string[];
  proofData?: string;
  ethBlock?: number;
  ethTxHash?: string;
  created: string;
}

export interface TxServerResponse {
  txHash: string;
  rollup?: LinkedRollup;
  proofData: string;
  viewingKeys: string[];
  created: string;
}

const toRollup = ({ id, status, dataRoot, proofData, txHashes, ethTxHash, created }: RollupServerResponse): Rollup => ({
  id,
  status,
  dataRoot: Buffer.from(dataRoot, 'hex'),
  proofData: proofData ? Buffer.from(proofData, 'hex') : undefined,
  txHashes: txHashes.map(txHash => TxHash.fromString(txHash)),
  ethTxHash: ethTxHash ? TxHash.fromString(ethTxHash) : undefined,
  created: new Date(created),
});

const toTx = ({ txHash, proofData, viewingKeys, rollup, created }: TxServerResponse): Tx => {
  const { newNote1, newNote2, nullifier1, nullifier2, publicInput, publicOutput, noteTreeRoot } = new ProofData(
    Buffer.from(proofData, 'hex'),
    viewingKeys.map(vk => Buffer.from(vk, 'hex')),
  );
  return {
    txHash: TxHash.fromString(txHash),
    merkleRoot: noteTreeRoot,
    newNote1,
    newNote2,
    nullifier1,
    nullifier2,
    publicInput,
    publicOutput,
    rollup,
    created: new Date(created),
  };
};

export class ServerRollupProviderExplorer implements RollupProviderExplorer {
  private baseUrl: string;

  constructor(baseUrl: URL) {
    this.baseUrl = baseUrl.toString().replace(/\/$/, '');
  }

  async getLatestRollups(count: number) {
    const url = new URL(`${this.baseUrl}/get-rollups`);
    url.searchParams.append('count', `${count}`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const rollups = (await response.json()) as RollupServerResponse[];
    return rollups.map(toRollup);
  }

  async getLatestTxs(count: number) {
    const url = new URL(`${this.baseUrl}/get-txs`);
    url.searchParams.append('count', `${count}`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const txs = (await response.json()) as TxServerResponse[];
    return txs.map(toTx);
  }

  async getRollup(id: number) {
    const url = new URL(`${this.baseUrl}/get-rollup`);
    url.searchParams.append('id', `${id}`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const rollup = await response.json();
    return rollup ? toRollup(rollup) : undefined;
  }

  async getTx(txHash: TxHash) {
    const url = new URL(`${this.baseUrl}/get-tx`);
    url.searchParams.append('txHash', txHash.toString());

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const tx = await response.json();
    return tx ? toTx(tx) : undefined;
  }
}
