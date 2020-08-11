import createDebug from 'debug';
import { Proof, RollupProvider, RollupProviderStatus } from './rollup_provider';

const debug = createDebug('bb:server_rollup_provider');

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
    return {
      txHash: Buffer.from(body.txId, 'hex'),
    };
  }

  async status(): Promise<RollupProviderStatus> {
    const url = new URL(`/api/status`, this.host);
    const response = await fetch(url.toString());
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }
    const body = await response.json();
    return {
      ...body,
      dataRoot: Buffer.from(body.dataRoot, 'hex'),
      nullRoot: Buffer.from(body.nullRoot, 'hex'),
    };
  }
}
