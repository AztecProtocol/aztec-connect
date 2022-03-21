/// <reference types="node" />
import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { ServerBlockSource } from '../block_source';
import { BridgeId } from '../bridge_id';
import { Tx } from '../rollup_provider';
import { TxId } from '../tx_id';
import { AccountTx, JoinSplitTx, RollupProvider } from './rollup_provider';
export interface TxServerResponse {
    proofData: string;
    offchainData: string;
}
export interface AssetValueServerResponse {
    assetId: number;
    value: string;
}
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
export declare class ServerRollupProvider extends ServerBlockSource implements RollupProvider {
    constructor(baseUrl: URL, pollInterval?: number);
    sendTxs(txs: Tx[]): Promise<any>;
    getTxFees(assetId: number): Promise<{
        assetId: number;
        value: bigint;
    }[][]>;
    getDefiFees(bridgeId: BridgeId): Promise<{
        assetId: number;
        value: bigint;
    }[]>;
    getStatus(): Promise<import("./rollup_provider").RollupProviderStatus>;
    getPendingTxs(): Promise<{
        txId: TxId;
        noteCommitment1: Buffer;
        noteCommitment2: Buffer;
    }[]>;
    getPendingNoteNullifiers(): Promise<Buffer[]>;
    clientLog(log: any): Promise<void>;
    getInitialWorldState(): Promise<{
        initialAccounts: Buffer;
    }>;
    getLatestAccountNonce(accountPubKey: GrumpkinAddress): Promise<number>;
    getLatestAliasNonce(alias: string): Promise<number>;
    getAccountId(alias: string, nonce?: number): Promise<AccountId | undefined>;
    getUnsettledAccountTxs(): Promise<AccountTx[]>;
    getUnsettledPaymentTxs(): Promise<JoinSplitTx[]>;
    private fetch;
}
//# sourceMappingURL=server_rollup_provider.d.ts.map