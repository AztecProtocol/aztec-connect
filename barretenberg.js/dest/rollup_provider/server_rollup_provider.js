"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerRollupProvider = void 0;
const account_id_1 = require("../account_id");
const block_source_1 = require("../block_source");
const client_proofs_1 = require("../client_proofs");
const iso_fetch_1 = require("../iso_fetch");
const offchain_tx_data_1 = require("../offchain_tx_data");
const tx_id_1 = require("../tx_id");
const rollup_provider_1 = require("./rollup_provider");
const toAccountTx = ({ proofData, offchainData }) => ({
    proofData: client_proofs_1.AccountProofData.fromBuffer(Buffer.from(proofData, 'hex')),
    offchainData: offchain_tx_data_1.OffchainAccountData.fromBuffer(Buffer.from(offchainData, 'hex')),
});
const toJoinSplitTx = ({ proofData, offchainData }) => ({
    proofData: client_proofs_1.JoinSplitProofData.fromBuffer(Buffer.from(proofData, 'hex')),
    offchainData: offchain_tx_data_1.OffchainJoinSplitData.fromBuffer(Buffer.from(offchainData, 'hex')),
});
const toAssetValue = ({ assetId, value }) => ({
    assetId,
    value: BigInt(value),
});
class ServerRollupProvider extends block_source_1.ServerBlockSource {
    constructor(baseUrl, pollInterval = 10000) {
        super(baseUrl, pollInterval);
    }
    async sendTxs(txs) {
        const data = txs.map(({ proofData, offchainTxData, depositSignature }) => ({
            proofData: proofData.toString('hex'),
            offchainTxData: offchainTxData.toString('hex'),
            depositSignature: depositSignature ? depositSignature.toString('hex') : undefined,
        }));
        const response = await this.fetch('/txs', data);
        const body = await response.json();
        return body.txIds.map(txId => tx_id_1.TxId.fromString(txId));
    }
    async getTxFees(assetId) {
        const response = await this.fetch('/tx-fees', { assetId });
        const txFees = (await response.json());
        return txFees.map(fees => fees.map(toAssetValue));
    }
    async getDefiFees(bridgeId) {
        const response = await this.fetch('/defi-fees', { bridgeId: bridgeId.toString() });
        const defiFees = (await response.json());
        return defiFees.map(toAssetValue);
    }
    async getStatus() {
        const response = await this.fetch('/status');
        try {
            return (0, rollup_provider_1.rollupProviderStatusFromJson)(await response.json());
        }
        catch (err) {
            throw new Error('Bad response: getStatus()');
        }
    }
    async getPendingTxs() {
        const response = await this.fetch('/get-pending-txs');
        const txs = (await response.json());
        return txs.map(tx => ({
            txId: tx_id_1.TxId.fromString(tx.txId),
            noteCommitment1: Buffer.from(tx.noteCommitment1, 'hex'),
            noteCommitment2: Buffer.from(tx.noteCommitment2, 'hex'),
        }));
    }
    async getPendingNoteNullifiers() {
        const response = await this.fetch('/get-pending-note-nullifiers');
        const nullifiers = (await response.json());
        return nullifiers.map(n => Buffer.from(n, 'hex'));
    }
    async clientLog(log) {
        await this.fetch('/client-log', log);
    }
    async getInitialWorldState() {
        const response = await this.fetch('/get-initial-world-state');
        const arrBuffer = await response.arrayBuffer();
        return {
            initialAccounts: Buffer.from(arrBuffer),
        };
    }
    async getLatestAccountNonce(accountPubKey) {
        const response = await this.fetch('/get-latest-account-nonce', {
            accountPubKey: accountPubKey.toString(),
        });
        return +(await response.text());
    }
    async getLatestAliasNonce(alias) {
        const response = await this.fetch('/get-latest-alias-nonce', { alias });
        return +(await response.text());
    }
    async getAccountId(alias, nonce) {
        const response = await this.fetch('/get-account-id', { alias, nonce });
        const accountId = await response.text();
        return accountId ? account_id_1.AccountId.fromString(accountId) : undefined;
    }
    async getUnsettledAccountTxs() {
        const response = await this.fetch('/get-unsettled-account-txs');
        const txs = (await response.json());
        return txs.map(toAccountTx);
    }
    async getUnsettledPaymentTxs() {
        const response = await this.fetch('/get-unsettled-payment-txs');
        const txs = (await response.json());
        return txs.map(toJoinSplitTx);
    }
    async fetch(path, data) {
        const url = new URL(`${this.baseUrl}${path}`);
        const init = data ? { method: 'POST', body: JSON.stringify(data) } : undefined;
        const response = await (0, iso_fetch_1.fetch)(url.toString(), init).catch(() => undefined);
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
exports.ServerRollupProvider = ServerRollupProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyX3JvbGx1cF9wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb2xsdXBfcHJvdmlkZXIvc2VydmVyX3JvbGx1cF9wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4Q0FBMEM7QUFFMUMsa0RBQW9EO0FBRXBELG9EQUF3RTtBQUN4RSw0Q0FBcUM7QUFDckMsMERBQWlGO0FBRWpGLG9DQUFnQztBQUNoQyx1REFBeUc7QUFZekcsTUFBTSxXQUFXLEdBQUcsQ0FBQyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQW9CLEVBQWEsRUFBRSxDQUFDLENBQUM7SUFDakYsU0FBUyxFQUFFLGdDQUFnQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNyRSxZQUFZLEVBQUUsc0NBQW1CLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO0NBQy9FLENBQUMsQ0FBQztBQUVILE1BQU0sYUFBYSxHQUFHLENBQUMsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFvQixFQUFlLEVBQUUsQ0FBQyxDQUFDO0lBQ3JGLFNBQVMsRUFBRSxrQ0FBa0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkUsWUFBWSxFQUFFLHdDQUFxQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztDQUNqRixDQUFDLENBQUM7QUFFSCxNQUFNLFlBQVksR0FBRyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBNEIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN0RSxPQUFPO0lBQ1AsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUM7Q0FDckIsQ0FBQyxDQUFDO0FBY0gsTUFBYSxvQkFB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