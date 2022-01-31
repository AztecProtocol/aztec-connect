import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { ServerBlockSource } from '../block_source';
import { BridgeId } from '../bridge_id';
import { AccountProofData, JoinSplitProofData } from '../client_proofs';
import { fetch } from '../iso_fetch';
import { OffchainAccountData, OffchainJoinSplitData } from '../offchain_tx_data';
import { Tx } from '../rollup_provider';
import { TxId } from '../tx_id';
import { AccountTx, JoinSplitTx, RollupProvider, rollupProviderStatusFromJson } from './rollup_provider';

export interface TxServerResponse {
  proofData: string;
  offchainData: string;
}

export interface AssetValueServerResponse {
  assetId: number;
  value: string;
}

const toAccountTx = ({ proofData, offchainData }: TxServerResponse): AccountTx => ({
  proofData: AccountProofData.fromBuffer(Buffer.from(proofData, 'hex')),
  offchainData: OffchainAccountData.fromBuffer(Buffer.from(offchainData, 'hex')),
});

const toJoinSplitTx = ({ proofData, offchainData }: TxServerResponse): JoinSplitTx => ({
  proofData: JoinSplitProofData.fromBuffer(Buffer.from(proofData, 'hex')),
  offchainData: OffchainJoinSplitData.fromBuffer(Buffer.from(offchainData, 'hex')),
});

const toAssetValue = ({ assetId, value }: AssetValueServerResponse) => ({
  assetId,
  value: BigInt(value),
});

export interface PendingTxServerResponse {
  txId: string;
  noteCommitment1: string;
  noteCommitment2: string;
}

export interface TxPostData {
  proofData: string;
  offchainTxData: string;
  depositSignature?: string;
}

export class ServerRollupProvider extends ServerBlockSource implements RollupProvider {
  constructor(baseUrl: URL, pollInterval = 10000) {
    super(baseUrl, pollInterval);
  }

  async sendTxs(txs: Tx[]) {
    const data = txs.map(
      ({ proofData, offchainTxData, depositSignature }): TxPostData => ({
        proofData: proofData.toString('hex'),
        offchainTxData: offchainTxData.toString('hex'),
        depositSignature: depositSignature ? depositSignature.toString('hex') : undefined,
      }),
    );
    const response = await this.fetch('/txs', data);
    const body = await response.json();
    return body.txIds.map(txId => TxId.fromString(txId));
  }

  async getTxFees(assetId: number) {
    const response = await this.fetch('/tx-fees', { assetId });
    const txFees = (await response.json()) as AssetValueServerResponse[][];
    return txFees.map(fees => fees.map(toAssetValue));
  }

  async getDefiFees(bridgeId: BridgeId) {
    const response = await this.fetch('/defi-fees', { bridgeId: bridgeId.toString() });
    const defiFees = (await response.json()) as AssetValueServerResponse[];
    return defiFees.map(toAssetValue);
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
    const txs = (await response.json()) as PendingTxServerResponse[];
    return txs.map(tx => ({
      txId: TxId.fromString(tx.txId),
      noteCommitment1: Buffer.from(tx.noteCommitment1, 'hex'),
      noteCommitment2: Buffer.from(tx.noteCommitment2, 'hex'),
    }));
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
    const txs = (await response.json()) as TxServerResponse[];
    return txs.map(toAccountTx);
  }

  async getUnsettledPaymentTxs() {
    const response = await this.fetch('/get-unsettled-payment-txs');
    const txs = (await response.json()) as TxServerResponse[];
    return txs.map(toJoinSplitTx);
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
