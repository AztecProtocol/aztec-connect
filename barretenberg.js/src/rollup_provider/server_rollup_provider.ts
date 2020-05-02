import createDebug from 'debug';
import { Proof, RollupProvider } from '.';

const debug = createDebug('bb:server_rollup_provider');

export class ServerRollupProvider implements RollupProvider {
  constructor(private host: URL) {}

  async sendProof( {proofData, encViewingKey1, encViewingKey2 }: Proof) {
      const url = new URL(`/api/tx`, this.host);
      const data = {
        proofData: proofData.toString('hex'),
        encViewingKey1: encViewingKey1.toString('hex'),
        encViewingKey2: encViewingKey2.toString('hex'),
      };
      const response = await fetch(url.toString(), { method: 'POST', body: JSON.stringify(data) });
      if (response.status !== 200) {
        throw new Error(`Bad response code ${response.status}.`)
      }
  }
}
