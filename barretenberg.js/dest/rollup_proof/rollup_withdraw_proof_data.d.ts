/// <reference types="node" />
import { EthAddress } from '../address';
import { InnerProofData } from './inner_proof';
export declare class RollupWithdrawProofData {
    readonly proofData: InnerProofData;
    static ENCODED_LENGTH: number;
    constructor(proofData: InnerProofData);
    get ENCODED_LENGTH(): number;
    get assetId(): number;
    get publicValue(): bigint;
    get publicOwner(): EthAddress;
    static decode(encoded: Buffer): RollupWithdrawProofData;
    encode(): Buffer;
}
//# sourceMappingURL=rollup_withdraw_proof_data.d.ts.map