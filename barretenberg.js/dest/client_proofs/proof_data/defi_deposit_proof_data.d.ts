/// <reference types="node" />
import { BridgeId } from '../../bridge_id';
import { ProofData } from './proof_data';
export declare class DefiDepositProofData {
    readonly proofData: ProofData;
    constructor(proofData: ProofData);
    static fromBuffer(rawProofData: Buffer): DefiDepositProofData;
    get txFee(): bigint;
    get txFeeAssetId(): number;
    get bridgeId(): BridgeId;
    get defiDepositValue(): bigint;
}
//# sourceMappingURL=defi_deposit_proof_data.d.ts.map