import { ProofId } from '../client_proofs/proof_data';
import { InnerProofData, RollupProofData } from './';
export declare const randomDepositProofData: () => InnerProofData;
export declare const randomSendProofData: () => InnerProofData;
export declare const randomWithdrawProofData: () => InnerProofData;
export declare const randomInnerProofData: (proofId?: ProofId) => InnerProofData;
export declare const createRollupProofData: (innerProofs: InnerProofData[]) => RollupProofData;
//# sourceMappingURL=fixtures.d.ts.map