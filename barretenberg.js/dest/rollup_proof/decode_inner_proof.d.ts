/// <reference types="node" />
import { RollupAccountProofData } from './rollup_account_proof_data';
import { RollupDefiClaimProofData } from './rollup_defi_claim_proof_data';
import { RollupDefiDepositProofData } from './rollup_defi_deposit_proof_data';
import { RollupDepositProofData } from './rollup_deposit_proof_data';
import { RollupPaddingProofData } from './rollup_padding_proof_data';
import { RollupSendProofData } from './rollup_send_proof_data';
import { RollupWithdrawProofData } from './rollup_withdraw_proof_data';
export declare const decodeInnerProof: (encoded: Buffer) => RollupAccountProofData | RollupDefiClaimProofData | RollupDefiDepositProofData | RollupDepositProofData | RollupPaddingProofData | RollupSendProofData | RollupWithdrawProofData;
//# sourceMappingURL=decode_inner_proof.d.ts.map