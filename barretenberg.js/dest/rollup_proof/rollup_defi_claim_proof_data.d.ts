/// <reference types="node" />
import { BridgeId } from '../bridge_id';
import { InnerProofData } from './inner_proof';
export declare class RollupDefiClaimProofData {
    readonly proofData: InnerProofData;
    static ENCODED_LENGTH: number;
    constructor(proofData: InnerProofData);
    get ENCODED_LENGTH(): number;
    get bridgeId(): BridgeId;
    static decode(encoded: Buffer): RollupDefiClaimProofData;
    encode(): Buffer;
}
//# sourceMappingURL=rollup_defi_claim_proof_data.d.ts.map