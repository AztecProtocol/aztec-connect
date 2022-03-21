/// <reference types="node" />
import { InnerProofData } from './inner_proof';
export declare class RollupSendProofData {
    readonly proofData: InnerProofData;
    static ENCODED_LENGTH: number;
    constructor(proofData: InnerProofData);
    get ENCODED_LENGTH(): number;
    static decode(encoded: Buffer): RollupSendProofData;
    encode(): Buffer;
}
//# sourceMappingURL=rollup_send_proof_data.d.ts.map