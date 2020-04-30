import createDebug from 'debug';
import { RollupProvider } from './rollup_provider';

const debug = createDebug('bb:local_rollup_provider');

export class ServerRollupProvider implements RollupProvider {
  constructor(private host: URL) {
  }

  async sendProof(proof: Buffer) {
      const url = new URL(`/api/tx`, this.host);
      const response = await fetch(url.toString(), { method: 'POST', body: proof });
      if (response.status !== 200) {
        throw new Error(`Bad response code ${response.status}.`)
      }
  }
}