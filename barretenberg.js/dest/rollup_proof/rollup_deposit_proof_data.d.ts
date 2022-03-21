/// <reference types="node" />
import { EthAddress } from '../address';
import { InnerProofData } from './inner_proof';
export declare class RollupDepositProofData {
    readonly proofData: InnerProofData;
    static ENCODED_LENGTH: number;
    constructor(proofData: InnerProofData);
    get ENCODED_LENGTH(): number;
    get assetId(): number;
    get publicValue(): bigint;
    get publicOwner(): EthAddress;
    static decode(encoded: Buffer): RollupDepositProofData;
    encode(): Buffer;
}
//# sourceMappingURL=rollup_deposit_proof_data.d.ts.map