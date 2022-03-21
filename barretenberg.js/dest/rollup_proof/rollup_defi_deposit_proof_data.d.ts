/// <reference types="node" />
import { BridgeId } from '../bridge_id';
import { InnerProofData } from './inner_proof';
export declare class RollupDefiDepositProofData {
    readonly proofData: InnerProofData;
    static ENCODED_LENGTH: number;
    constructor(proofData: InnerProofData);
    get ENCODED_LENGTH(): number;
    get bridgeId(): BridgeId;
    get deposit(): bigint;
    static decode(encoded: Buffer): RollupDefiDepositProofData;
    encode(): Buffer;
}
//# sourceMappingURL=rollup_defi_deposit_proof_data.d.ts.map