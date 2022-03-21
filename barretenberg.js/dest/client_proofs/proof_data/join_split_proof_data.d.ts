/// <reference types="node" />
import { EthAddress } from '../../address';
import { ProofData } from './proof_data';
export declare class JoinSplitProofData {
    readonly proofData: ProofData;
    constructor(proofData: ProofData);
    static fromBuffer(rawProofData: Buffer): JoinSplitProofData;
    get txId(): Buffer;
    get publicAssetId(): number;
    get publicValue(): bigint;
    get publicOwner(): EthAddress;
    get txFee(): bigint;
    get txFeeAssetId(): number;
}
//# sourceMappingURL=join_split_proof_data.d.ts.map