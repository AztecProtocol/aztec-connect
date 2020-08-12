import createDebug from 'debug';
import { Proof, RollupProvider, RollupProviderStatus, ProofResponse } from './rollup_provider';
import { ProofServerResponse, RollupProviderStatusServerResponse } from './server_response';

const debug = createDebug('bb:server_rollup_provider');

const toProof = ({ txHash }: ProofServerResponse): ProofResponse => ({
  txHash: Buffer.from(txHash, 'hex'),
});

const toRollupProviderStatus = (status: RollupProviderStatusServerResponse): RollupProviderStatus => ({
  ...status,
  dataRoot: Buffer.from(status.dataRoot, 'hex'),
  nullRoot: Buffer.from(status.nullRoot, 'hex'),
});

export class ServerRollupProvider implements RollupProvider {
  constructor(private host: URL) {}

  async sendProof({ proofData, viewingKeys, depositSignature, ...rest }: Proof) {
    const url = new URL(`/api/tx`, this.host);
    const data = {
      proofData: proofData.toString('hex'),
      viewingKeys: viewingKeys.map(v => v.toString('hex')),
      depositSignature: depositSignature ? depositSignature.toString('hex') : undefined,
      ...rest,
    };
    const response = await fetch(url.toString(), { method: 'POST', body: JSON.stringify(data) });
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }
    const body = await response.json();
    return toProof(body);
  }

  async status() {
    const url = new URL(`/api/status`, this.host);
    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }
    const body = await response.json();
    return toRollupProviderStatus(body);
  }
}
