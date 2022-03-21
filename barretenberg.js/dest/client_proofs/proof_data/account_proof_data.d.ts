/// <reference types="node" />
import { ProofData } from './proof_data';
export declare class AccountProofData {
    readonly proofData: ProofData;
    constructor(proofData: ProofData);
    static fromBuffer(rawProofData: Buffer): AccountProofData;
}
//# sourceMappingURL=account_proof_data.d.ts.map