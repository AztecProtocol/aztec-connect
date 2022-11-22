// Barretenberg imports
import { Tx, txToJson, pendingTxFromJson } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { initialWorldStateFromBuffer } from '@aztec/barretenberg/rollup_provider';
import { fetch } from '@aztec/barretenberg/iso_fetch';

export class SecondClassRollupProviderLimited {
  protected baseUrl: string;
  private serverAuthToken!: string;

  constructor(baseUrl: string, liveRun = false) {
    this.baseUrl = baseUrl.replace(/\/$/, '');

    if (liveRun && !process.env.SERVER_AUTH_TOKEN) {
      throw new Error('Set `SERVER_AUTH_TOKEN` in environment to submit second-class txs to falafel');
    }
    this.serverAuthToken = liveRun ? process.env.SERVER_AUTH_TOKEN! : '!changeme#';
  }

  /**
   * Send second-class transactions to falafel (baseUrl) to be included in rollup
   * @param txs Transaction data including account proofs, offchainData and signatures
   */
  public async sendSecondClassTxs(txs: Tx[]) {
    const data = txs.map(txToJson);
    const response = await this.fetch('/txs-second-class', data, true);
    const body = await response.json();
    return body.txIds.map((txId: string) => TxId.fromString(txId));
  }

  async getPendingTxs() {
    const response = await this.fetch('/get-pending-txs');
    const txs = await response.json();
    return txs.map(pendingTxFromJson);
  }

  async getPendingSecondClassTxCount() {
    const response = await this.fetch('/status');
    return (await response.json()).pendingSecondClassTxCount;
  }

  async isAccountRegistered(accountKey: GrumpkinAddress) {
    const response = await this.fetch('/is-account-registered', { accountPublicKey: accountKey.toString() });
    return await response.json();
  }

  async getInitialWorldState() {
    const response = await this.fetch('/get-initial-world-state');
    const arrBuffer = await response.arrayBuffer();
    return initialWorldStateFromBuffer(Buffer.from(arrBuffer));
  }

  /**
   * Submits a request to baseUrl at the specified path.
   *
   * @remarks
   * If data is provided, a POST is sent with that data as the body.
   * The response is checked for errors and handled accordingly.
   *
   * @param path Path to source at baseUrl
   * @param data Data to be submitted in POST request
   * @returns fetch response
   * @throws Error when response is undefined or contains an error status
   */
  private async fetch(path: string, data?: any, validateAuth = false) {
    const url = new URL(`${this.baseUrl}${path}`);
    const init: { [k: string]: any } = data ? { method: 'POST', body: JSON.stringify(data) } : {};
    if (init && validateAuth) {
      init['headers'] = { 'server-auth-token': this.serverAuthToken };
    }
    const response = await fetch(url.toString(), init).catch(() => undefined);
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
    return response;
  }
}
