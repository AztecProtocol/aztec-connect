import { RollupProvider } from './rollup_provider';
import { fetch } from '../iso_fetch';
import { ServerBlockSource } from '../block_source';
import { Proof } from '../rollup_provider';
import { TxHash } from '../tx_hash';
import { blockchainStatusFromJson } from '../blockchain';

export interface PendingTxServerResponse {
  txId: string;
  noteCommitment1: string;
  noteCommitment2: string;
}

export class ServerRollupProvider extends ServerBlockSource implements RollupProvider {
  constructor(baseUrl: URL, pollInterval = 10000) {
    super(baseUrl, pollInterval);
  }

  async sendProof({ proofData, offchainTxData, depositSignature, ...rest }: Proof) {
    const url = new URL(`${this.baseUrl}/tx`);
    const data = {
      proofData: proofData.toString('hex'),
      offchainTxData: offchainTxData.toString('hex'),
      depositSignature: depositSignature ? depositSignature.toString('hex') : undefined,
      ...rest,
    };
    const response = await fetch(url.toString(), { method: 'POST', body: JSON.stringify(data) }).catch(() => undefined);
    if (!response) {
      throw new Error('Failed to contact rollup provider.');
    }
    if (response.status === 400) {
      const body = await response.json();
      throw new Error(body.error);
    }
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }
    const body = await response.json();
    return TxHash.fromString(body.txHash);
  }

  async getStatus() {
    const url = new URL(`${this.baseUrl}/status`);
    const response = await fetch(url.toString()).catch(() => undefined);
    if (!response) {
      throw new Error('Failed to contact rollup provider.');
    }
    try {
      const { txFees, blockchainStatus, nextPublishTime, ...rest } = await response.json();

      return {
        ...rest,
        blockchainStatus: blockchainStatusFromJson(blockchainStatus),
        txFees: txFees.map(({ feeConstants, baseFeeQuotes }) => ({
          feeConstants: feeConstants.map(r => BigInt(r)),
          baseFeeQuotes: baseFeeQuotes.map(({ fee, time }) => ({
            time,
            fee: BigInt(fee),
          })),
        })),
        nextPublishTime: new Date(nextPublishTime),
      };
    } catch (err) {
      throw new Error(`Bad response from: ${url}`);
    }
  }

  async getPendingTxs() {
    const url = new URL(`${this.baseUrl}/get-pending-txs`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const txs = (await response.json()) as PendingTxServerResponse[];
    return txs.map(tx => ({
      txId: TxHash.fromString(tx.txId),
      noteCommitment1: Buffer.from(tx.noteCommitment1, 'hex'),
      noteCommitment2: Buffer.from(tx.noteCommitment2, 'hex'),
    }));
  }

  async getPendingNoteNullifiers() {
    const url = new URL(`${this.baseUrl}/get-pending-note-nullifiers`);

    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }

    const nullifiers = (await response.json()) as string[];
    return nullifiers.map(n => Buffer.from(n, 'hex'));
  }

  async clientLog(log: any) {
    const url = new URL(`${this.baseUrl}/client-log`);
    await fetch(url.toString(), { method: 'POST', body: JSON.stringify(log) }).catch(() => undefined);
  }

  async getInitialWorldState() {
    const url = new URL(`${this.baseUrl}/get-initial-world-state`);
    const response = await fetch(url.toString()).catch(() => undefined);
    if (!response) {
      throw new Error('Failed to contact rollup provider.');
    }
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }
    const arrBuffer = await response.arrayBuffer();
    return {
      initialAccounts: Buffer.from(arrBuffer),
    };
  }
}
