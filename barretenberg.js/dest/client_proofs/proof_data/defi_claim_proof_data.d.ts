/// <reference types="node" />
import { BridgeId } from '../../bridge_id';
import { ProofData } from './proof_data';
export declare class DefiClaimProofData {
    readonly proofData: ProofData;
    constructor(proofData: ProofData);
    static fromBuffer(rawProofData: Buffer): DefiClaimProofData;
    get txFee(): bigint;
    get txFeeAssetId(): number;
    get bridgeId(): BridgeId;
}
//# sourceMappingURL=defi_claim_proof_data.d.ts.map