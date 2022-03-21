/// <reference types="node" />
import { InnerProofData } from './inner_proof';
import { BridgeId } from '../bridge_id';
export declare enum RollupProofDataFields {
    ROLLUP_ID = 0,
    ROLLUP_SIZE = 1,
    DATA_START_INDEX = 2,
    OLD_DATA_ROOT = 3,
    NEW_DATA_ROOT = 4,
    OLD_NULL_ROOT = 5,
    NEW_NULL_ROOT = 6,
    OLD_ROOT_ROOT = 7,
    NEW_ROOT_ROOT = 8,
    OLD_DEFI_ROOT = 9,
    NEW_DEFI_ROOT = 10
}
export declare enum RollupProofDataOffsets {
    ROLLUP_ID = 28,
    ROLLUP_SIZE = 60,
    DATA_START_INDEX = 92,
    OLD_DATA_ROOT = 96,
    NEW_DATA_ROOT = 128,
    OLD_NULL_ROOT = 160,
    NEW_NULL_ROOT = 192,
    OLD_ROOT_ROOT = 224,
    NEW_ROOT_ROOT = 256,
    OLD_DEFI_ROOT = 288,
    NEW_DEFI_ROOT = 320
}
export declare class RollupProofData {
    rollupId: number;
    rollupSize: number;
    dataStartIndex: number;
    oldDataRoot: Buffer;
    newDataRoot: Buffer;
    oldNullRoot: Buffer;
    newNullRoot: Buffer;
    oldDataRootsRoot: Buffer;
    newDataRootsRoot: Buffer;
    oldDefiRoot: Buffer;
    newDefiRoot: Buffer;
    bridgeIds: Buffer[];
    defiDepositSums: bigint[];
    assetIds: number[];
    totalTxFees: bigint[];
    defiInteractionNotes: Buffer[];
    prevDefiInteractionHash: Buffer;
    rollupBeneficiary: Buffer;
    numRollupTxs: number;
    innerProofData: InnerProofData[];
    static NUMBER_OF_ASSETS: number;
    static NUM_BRIDGE_CALLS_PER_BLOCK: number;
    static NUM_ROLLUP_HEADER_INPUTS: number;
    static LENGTH_ROLLUP_HEADER_INPUTS: number;
    rollupHash: Buffer;
    constructor(rollupId: number, rollupSize: number, dataStartIndex: number, oldDataRoot: Buffer, newDataRoot: Buffer, oldNullRoot: Buffer, newNullRoot: Buffer, oldDataRootsRoot: Buffer, newDataRootsRoot: Buffer, oldDefiRoot: Buffer, newDefiRoot: Buffer, bridgeIds: Buffer[], defiDepositSums: bigint[], assetIds: number[], totalTxFees: bigint[], defiInteractionNotes: Buffer[], prevDefiInteractionHash: Buffer, rollupBeneficiary: Buffer, numRollupTxs: number, innerProofData: InnerProofData[]);
    toBuffer(): Buffer;
    getTotalDeposited(assetId: number): bigint;
    getTotalWithdrawn(assetId: number): bigint;
    getTotalDefiDeposit(assetId: number): bigint;
    getTotalFees(assetId: number): bigint;
    encode(): Buffer;
    static getRollupIdFromBuffer(proofData: Buffer): number;
    static getRollupSizeFromBuffer(proofData: Buffer): number;
    static fromBuffer(proofData: Buffer): RollupProofData;
    static randomData(rollupId: number, numTxs: number, dataStartIndex?: number, innerProofData?: InnerProofData[], bridgeIds?: BridgeId[]): RollupProofData;
    static decode(encoded: Buffer): RollupProofData;
}
//# sourceMappingURL=rollup_proof_data.d.ts.map