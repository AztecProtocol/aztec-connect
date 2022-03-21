/// <reference types="node" />
import { InnerProofData } from './inner_proof';
export declare class RollupPaddingProofData {
    readonly proofData: InnerProofData;
    static ENCODED_LENGTH: number;
    constructor(proofData: InnerProofData);
    get ENCODED_LENGTH(): number;
    static decode(encoded: Buffer): RollupPaddingProofData;
    encode(): Buffer;
}
//# sourceMappingURL=rollup_padding_proof_data.d.ts.map