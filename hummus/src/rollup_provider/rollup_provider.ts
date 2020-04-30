import { BlockSource, Block } from 'barretenberg-es/block_source';
import { EventEmitter } from 'events';
import createDebug from 'debug';
import { JoinSplitVerifier } from 'barretenberg-es/client_proofs/join_split_proof';

const debug = createDebug('bb:local_rollup_provider');

export interface RollupProvider {
  sendProof(proof: Buffer): Promise<void>;
}

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
}export interface RollupProvider {
  sendProof(proof: Buffer): Promise<void>;
}
