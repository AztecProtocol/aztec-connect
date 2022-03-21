/// <reference types="node" />
import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { AssetValue } from '../asset';
import { BlockchainStatus } from '../blockchain';
import { BlockSource } from '../block_source';
import { BridgeId, BridgeStatus } from '../bridge_id';
import { AccountProofData, JoinSplitProofData } from '../client_proofs';
import { OffchainAccountData, OffchainJoinSplitData } from '../offchain_tx_data';
import { TxId } from '../tx_id';
export declare enum TxSettlementTime {
    NEXT_ROLLUP = 0,
    INSTANT = 1
}
export declare enum DefiSettlementTime {
    DEADLINE = 0,
    NEXT_ROLLUP = 1,
    INSTANT = 2
}
export interface Tx {
    proofData: Buffer;
    offchainTxData: Buffer;
    depositSignature?: Buffer;
}
export interface RuntimeConfig {
    acceptingTxs: boolean;
    useKeyCache: boolean;
    publishInterval: number;
    flushAfterIdle: number;
    gasLimit: number;
    baseTxGas: number;
    verificationGas: number;
    maxFeeGasPrice: bigint;
    feeGasPriceMultiplier: number;
    maxProviderGasPrice: bigint;
    maxUnsettledTxs: number;
    defaultDeFiBatchSize: number;
}
export declare function runtimeConfigToJson(runtimeConfig: RuntimeConfig): {
    maxFeeGasPrice: string;
    maxProviderGasPrice: string;
    acceptingTxs: boolean;
    useKeyCache: boolean;
    publishInterval: number;
    flushAfterIdle: number;
    gasLimit: number;
    baseTxGas: number;
    verificationGas: number;
    feeGasPriceMultiplier: number;
    maxUnsettledTxs: number;
    defaultDeFiBatchSize: number;
};
export declare function runtimeConfigFromJson(runtimeConfig: any): any;
export interface RollupProviderStatus {
    blockchainStatus: BlockchainStatus;
    nextPublishTime: Date;
    nextPublishNumber: number;
    pendingTxCount: number;
    runtimeConfig: RuntimeConfig;
    bridgeStatus: BridgeStatus[];
    proverless: boolean;
}
export declare function rollupProviderStatusToJson(status: RollupProviderStatus): {
    blockchainStatus: import("../blockchain").BlockchainStatusJson;
    bridgeStatus: {
        bridgeId: string;
        numTxs: number;
        gasThreshold: string;
        gasAccrued: string;
        rollupFrequency: number;
        nextRollupNumber?: number | undefined;
        nextPublishTime?: Date | undefined;
    }[];
    runtimeConfig: {
        maxFeeGasPrice: string;
        maxProviderGasPrice: string;
        acceptingTxs: boolean;
        useKeyCache: boolean;
        publishInterval: number;
        flushAfterIdle: number;
        gasLimit: number;
        baseTxGas: number;
        verificationGas: number;
        feeGasPriceMultiplier: number;
        maxUnsettledTxs: number;
        defaultDeFiBatchSize: number;
    };
    nextPublishTime: Date;
    nextPublishNumber: number;
    pendingTxCount: number;
    proverless: boolean;
};
export declare function rollupProviderStatusFromJson(status: any): RollupProviderStatus;
export interface PendingTx {
    txId: TxId;
    noteCommitment1: Buffer;
    noteCommitment2: Buffer;
}
export interface InitialWorldState {
    initialAccounts: Buffer;
}
export interface AccountTx {
    proofData: AccountProofData;
    offchainData: OffchainAccountData;
}
export interface JoinSplitTx {
    proofData: JoinSplitProofData;
    offchainData: OffchainJoinSplitData;
}
export interface RollupProvider extends BlockSource {
    sendTxs(txs: Tx[]): Promise<TxId[]>;
    getStatus(): Promise<RollupProviderStatus>;
    getTxFees(assetId: number): Promise<AssetValue[][]>;
    getDefiFees(bridgeId: BridgeId): Promise<AssetValue[]>;
    getPendingTxs: () => Promise<PendingTx[]>;
    getPendingNoteNullifiers: () => Promise<Buffer[]>;
    clientLog: (msg: any) => Promise<void>;
    getInitialWorldState(): Promise<InitialWorldState>;
    getLatestAccountNonce(accountPubKey: GrumpkinAddress): Promise<number>;
    getLatestAliasNonce(alias: string): Promise<number>;
    getAccountId(alias: string, nonce?: number): Promise<AccountId | undefined>;
    getUnsettledAccountTxs: () => Promise<AccountTx[]>;
    getUnsettledPaymentTxs: () => Promise<JoinSplitTx[]>;
}
//# sourceMappingURL=rollup_provider.d.ts.map