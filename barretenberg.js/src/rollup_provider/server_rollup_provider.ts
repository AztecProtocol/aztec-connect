import createDebug from 'debug';
import { RollupProvider, RollupProviderStatus } from './rollup_provider';
import { RollupProviderStatusServerResponse } from './server_response';
import { EthAddress } from '../address';
import { fetch } from '../iso_fetch';
import { ServerBlockSource } from '../block_source';
import { Proof } from '../rollup_provider';

const debug = createDebug('bb:server_rollup_provider');

const toRollupProviderStatus = (status: RollupProviderStatusServerResponse): RollupProviderStatus => ({
  ...status,
  tokenContractAddress: EthAddress.fromString(status.tokenContractAddress),
  rollupContractAddress: EthAddress.fromString(status.rollupContractAddress),
  dataRoot: Buffer.from(status.dataRoot, 'hex'),
  nullRoot: Buffer.from(status.nullRoot, 'hex'),
  nextRollupId: status.nextRollupId,
});

export class ServerRollupProvider extends ServerBlockSource implements RollupProvider {
  constructor(host: URL) {
    super(host);
  }

  async sendProof({ proofData, viewingKeys, depositSignature, ...rest }: Proof) {
    const url = new URL(`/api/tx`, this.host);
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
    return Buffer.from(body.txHash, 'hex');
  }

  async status() {
    const url = new URL(`/api/status`, this.host);
    const response = await fetch(url.toString()).catch(() => undefined);
    if (!response) {
      throw new Error('Failed to contact rollup provider.');
    }
    if (response.status !== 200) {
      throw new Error(`Bad response code ${response.status}.`);
    }
    const body = await response.json();
    return toRollupProviderStatus(body);
  }
}
