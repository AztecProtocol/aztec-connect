import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { assetValueFromJson, AssetValueJson } from '../asset';
import { ServerBlockSource } from '../block_source';
import { BridgeId } from '../bridge_id';
import { fetch } from '../iso_fetch';
import { Tx } from '../rollup_provider';
import { TxId } from '../tx_id';
import { accountTxFromJson, joinSplitTxFromJson, pendingTxFromJson, RollupProvider, txToJson } from './rollup_provider';
import { rollupProviderStatusFromJson } from './rollup_provider_status';

export class ServerRollupProvider extends ServerBlockSource implements RollupProvider {
  constructor(baseUrl: URL, pollInterval = 10000) {
    super(baseUrl, pollInterval);
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

  async getDefiFees(bridgeId: BridgeId) {
    const response = await this.fetch('/defi-fees', { bridgeId: bridgeId.toString() });
    const defiFees = (await response.json()) as AssetValueJson[];
    return defiFees.map(assetValueFromJson);
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

  async clientLog(log: any) {
    await this.fetch('/client-log', log);
  }

  async getInitialWorldState() {
    const response = await this.fetch('/get-initial-world-state');
    const arrBuffer = await response.arrayBuffer();
    return {
      initialAccounts: Buffer.from(arrBuffer),
    };
  }

  async getLatestAccountNonce(accountPubKey: GrumpkinAddress) {
    const response = await this.fetch('/get-latest-account-nonce', {
      accountPubKey: accountPubKey.toString(),
    });
    return +(await response.text());
  }

  async getLatestAliasNonce(alias: string) {
    const response = await this.fetch('/get-latest-alias-nonce', { alias });
    return +(await response.text());
  }

  async getAccountId(alias: string, nonce?: number) {
    const response = await this.fetch('/get-account-id', { alias, nonce });
    const accountId = await response.text();
    return accountId ? AccountId.fromString(accountId) : undefined;
  }

  async getUnsettledAccountTxs() {
    const response = await this.fetch('/get-unsettled-account-txs');
    const txs = await response.json();
    return txs.map(accountTxFromJson);
  }

  async getUnsettledPaymentTxs() {
    const response = await this.fetch('/get-unsettled-payment-txs');
    const txs = await response.json();
    return txs.map(joinSplitTxFromJson);
  }

  private async fetch(path: string, data?: any) {
    const url = new URL(`${this.baseUrl}${path}`);
    const init = data ? { method: 'POST', body: JSON.stringify(data) } : undefined;
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
