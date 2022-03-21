/// <reference types="node" />
import { ProofId } from '../client_proofs';
export declare class InnerProofData {
    proofId: ProofId;
    noteCommitment1: Buffer;
    noteCommitment2: Buffer;
    nullifier1: Buffer;
    nullifier2: Buffer;
    publicValue: Buffer;
    publicOwner: Buffer;
    assetId: Buffer;
    static NUM_PUBLIC_INPUTS: number;
    static LENGTH: number;
    static PADDING: InnerProofData;
    txId: Buffer;
    constructor(proofId: ProofId, noteCommitment1: Buffer, noteCommitment2: Buffer, nullifier1: Buffer, nullifier2: Buffer, publicValue: Buffer, publicOwner: Buffer, assetId: Buffer);
    getDepositSigningData(): Buffer;
    toBuffer(): Buffer;
    isPadding(): boolean;
    static fromBuffer(innerPublicInputs: Buffer): InnerProofData;
}
//# sourceMappingURL=inner_proof.d.ts.map