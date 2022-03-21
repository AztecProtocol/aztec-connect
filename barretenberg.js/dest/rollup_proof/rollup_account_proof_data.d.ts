/// <reference types="node" />
import { InnerProofData } from './inner_proof';
export declare class RollupAccountProofData {
    readonly proofData: InnerProofData;
    static ENCODED_LENGTH: number;
    constructor(proofData: InnerProofData);
    get ENCODED_LENGTH(): number;
    static decode(encoded: Buffer): RollupAccountProofData;
    encode(): Buffer;
}
//# sourceMappingURL=rollup_account_proof_data.d.ts.map