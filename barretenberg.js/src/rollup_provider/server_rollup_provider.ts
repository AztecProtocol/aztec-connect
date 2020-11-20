import { RollupProvider } from './rollup_provider';
import { fetch } from '../iso_fetch';
import { ServerBlockSource } from '../block_source';
import { Proof } from '../rollup_provider';
import { getProviderStatus } from './get_provider_status';
import { TxHash } from './tx_hash';

export class ServerRollupProvider extends ServerBlockSource implements RollupProvider {
  constructor(baseUrl: URL) {
    super(baseUrl);
  }

  async sendProof({ proofData, viewingKeys, depositSignature, ...rest }: Proof) {
    const url = new URL(`${this.baseUrl}/tx`);
    const data = {
      proofData: proofData.toString('hex'),
      viewingKeys: viewingKeys.map(v => v.toString('hex')),
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
    return getProviderStatus(this.baseUrl);
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
}
