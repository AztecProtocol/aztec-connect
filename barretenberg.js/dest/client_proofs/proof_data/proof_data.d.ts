/// <reference types="node" />
import { ProofId } from './proof_id';
/**
 * Represents tx proof data as returned by the proof generator.
 * Differs to on chain data, in that not all data here is actually published.
 * Fields that differ between proofs, or natural buffers, are of type Buffer.
 * Fields that are always of fixed type/meaning are converted.
 */
export declare class ProofData {
    rawProofData: Buffer;
    static readonly NUM_PUBLIC_INPUTS = 17;
    static readonly NUM_PUBLISHED_PUBLIC_INPUTS = 8;
    static getProofIdFromBuffer(rawProofData: Buffer): number;
    readonly txId: Buffer;
    readonly proofId: ProofId;
    readonly noteCommitment1: Buffer;
    readonly noteCommitment2: Buffer;
    readonly nullifier1: Buffer;
    readonly nullifier2: Buffer;
    readonly publicValue: Buffer;
    readonly publicOwner: Buffer;
    readonly publicAssetId: Buffer;
    readonly noteTreeRoot: Buffer;
    readonly txFee: Buffer;
    readonly txFeeAssetId: Buffer;
    readonly bridgeId: Buffer;
    readonly defiDepositValue: Buffer;
    readonly defiRoot: Buffer;
    readonly backwardLink: Buffer;
    readonly allowChain: Buffer;
    constructor(rawProofData: Buffer);
    get allowChainFromNote1(): boolean;
    get allowChainFromNote2(): boolean;
}
//# sourceMappingURL=proof_data.d.ts.map