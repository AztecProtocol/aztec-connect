import createDebug from 'debug';
import { Proof, RollupProvider } from './rollup_provider';

const debug = createDebug('bb:server_rollup_provider');

export class ServerRollupProvider implements RollupProvider {
  constructor(private host: URL) {}

  async sendProof(proof: Proof) {
      const url = new URL(`/api/tx`, this.host);
      const data = {
        proofData: proof.proofData.toString('hex'),
        encryptedViewingKey1: proof.encryptedViewingKey1.toString('hex'),
        encryptedViewingKey2: proof.encryptedViewingKey2.toString('hex'),
      };
      const response = await fetch(url.toString(), { method: 'POST', body: JSON.stringify(data) });
      if (response.status !== 200) {
        throw new Error(`Bad response code ${response.status}.`)
      }
  }
}
