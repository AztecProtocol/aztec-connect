import { GrumpkinAddress } from '../address/index.js';
import { assetValueFromJson, AssetValueJson } from '../asset/index.js';
import { ServerBlockSource } from '../block_source/index.js';
import { BridgeCallData } from '../bridge_call_data/index.js';
import { fetch } from '../iso_fetch/index.js';
import { Tx } from '../rollup_provider/index.js';
import { TxId } from '../tx_id/index.js';
import {
  BridgePublishQuery,
  BridgePublishQueryResult,
  bridgePublishQueryToJson,
  bridgePublshQueryResultFromJson,
} from './bridge_publish_stats_query.js';
import {
  depositTxFromJson,
  pendingTxFromJson,
  RollupProvider,
  txToJson,
  initialWorldStateFromBuffer,
} from './rollup_provider.js';
import { rollupProviderStatusFromJson } from './rollup_provider_status.js';

/* Custom error for server/client version mismatches
 */
export class ClientVersionMismatchError extends Error {
  constructor(message: string) {
    super(`Version mismatch with rollup provider. Error: ${message}`);
  }
}

/* Make a request to the rollup provider's status endpoint
 *
 * @remarks
 * Construct a request to the status endpoint, submit it, check for errors and returns the status as a JS object
 *
 * @param baseUrl - rollup provider server URL string to make request to
 * @param clientVersion - optional version tag to insert into request header to be validated by rollup provider server
 * if this version is provided and does not match server version, server should respond with 409 Conflict
 *
 * @returns object containing status of rollup provider
 *
 * @throws {@link Error}
 * Thrown if a failure occurs when interpreting the request response as JSON
 *
 * @throws {@link ClientVersionMismatchError}
 * Thrown if the rollup provider server returns a '409 Conflict' due to a server/client version mismatch
 */
export async function getRollupProviderStatus(baseUrl: string, clientVersion?: string) {
  const url = `${baseUrl}/status`;
  const init = clientVersion ? ({ headers: { version: clientVersion } } as RequestInit) : {};
  const response = await fetch(url, init);

  let body: any;
  try {
    body = await response.json();
  } catch (err: any) {
    throw new Error(`Bad response from ${baseUrl}: ${err.message}`);
  }

  if (response.status == 409) {
    throw new ClientVersionMismatchError(body.error);
  }
  return rollupProviderStatusFromJson(body);
}

export class ServerRollupProvider extends ServerBlockSource implements RollupProvider {
  constructor(baseUrl: URL, pollInterval = 10000, version = '') {
    super(baseUrl, pollInterval, version);
  }

  async sendTxs(txs: Tx[]) {
    const data = txs.map(txToJson);
    const response = await this.fetch('/txs', data);
    const body = await response.json();
    return body.txIds.map(txId => TxId.fromString(txId));
  }

  async getTxFees(assetId: number) {
    const response = await this.fetch('/tx-fees', { assetId });
    const txFees = (await response.json()) as AssetValueJson[][];
    return txFees.map(fees => fees.map(assetValueFromJson));
  }

  async getDefiFees(bridgeCallData: BridgeCallData) {
    const response = await this.fetch('/defi-fees', { bridgeCallData: bridgeCallData.toString() });
    const defiFees = (await response.json()) as AssetValueJson[];
    return defiFees.map(assetValueFromJson);
  }

  async queryDefiPublishStats(query: BridgePublishQuery): Promise<BridgePublishQueryResult> {
    const response = await this.fetch('/bridge-query', bridgePublishQueryToJson(query));
    const jsonResponse = await response.json();
    return bridgePublshQueryResultFromJson(jsonResponse);
  }

  async getStatus() {
    const response = await this.fetch('/status');
    try {
      return rollupProviderStatusFromJson(await response.json());
    } catch (err) {
      throw new Error('Bad response: getStatus()');
    }
  }

  async getPendingTxs() {
    const response = await this.fetch('/get-pending-txs');
    const txs = await response.json();
    return txs.map(pendingTxFromJson);
  }

  async getPendingNoteNullifiers() {
    const response = await this.fetch('/get-pending-note-nullifiers');
    const nullifiers = (await response.json()) as string[];
    return nullifiers.map(n => Buffer.from(n, 'hex'));
  }

  async getPendingDepositTxs() {
    const response = await this.fetch('/get-pending-deposit-txs');
    const txs = await response.json();
    return txs.map(depositTxFromJson);
  }

  async clientLog(log: any) {
    await this.fetch('/client-log', log);
  }

  async getInitialWorldState() {
    const response = await this.fetch('/get-initial-world-state');
    const arrBuffer = await response.arrayBuffer();
    return initialWorldStateFromBuffer(Buffer.from(arrBuffer));
  }

  async isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    const response = await this.fetch('/is-account-registered', {
      accountPublicKey: accountPublicKey.toString(),
    });
    return +(await response.text()) === 1;
  }

  async isAliasRegistered(alias: string) {
    const response = await this.fetch('/is-alias-registered', { alias });
    return +(await response.text()) === 1;
  }

  async isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, alias: string) {
    const response = await this.fetch('/is-alias-registered-to-account', {
      accountPublicKey: accountPublicKey.toString(),
      alias,
    });
    return +(await response.text()) === 1;
  }

  /**
   * Submits a request to baseUrl at the specified path
   * If data is provided, a POST is sent with that data as the body.
   * The response is checked for errors and handled accordingly.
   * @param path Path to source at baseUrl
   * @param data Data to be submitted in POST request
   * @returns fetch response
   * @throws Error when response is undefined or contains an error status
   */
  private async fetch(path: string, data?: any) {
    const url = new URL(`${this.baseUrl}${path}`);

    const init = this.version ? ({ headers: { version: this.version } } as RequestInit) : {};
    if (data) {
      init['method'] = 'POST';
      init['body'] = JSON.stringify(data);
    }

    const response = await fetch(url.toString(), init).catch(() => undefined);

    if (!response) {
      throw new Error('Failed to contact rollup provider.');
    }
    if (response.status == 409) {
      const body = await response.json();
      this.emit('versionMismatch', body.error);
      throw new ClientVersionMismatchError(body.error);
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
