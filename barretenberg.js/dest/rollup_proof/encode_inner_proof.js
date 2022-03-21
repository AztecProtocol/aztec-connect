"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeInnerProof = void 0;
const client_proofs_1 = require("../client_proofs");
const rollup_account_proof_data_1 = require("./rollup_account_proof_data");
const rollup_defi_claim_proof_data_1 = require("./rollup_defi_claim_proof_data");
const rollup_defi_deposit_proof_data_1 = require("./rollup_defi_deposit_proof_data");
const rollup_deposit_proof_data_1 = require("./rollup_deposit_proof_data");
const rollup_send_proof_data_1 = require("./rollup_send_proof_data");
const rollup_withdraw_proof_data_1 = require("./rollup_withdraw_proof_data");
const rollup_padding_proof_data_1 = require("./rollup_padding_proof_data");
const recoverInnerProof = (proof) => {
    switch (proof.proofId) {
        case client_proofs_1.ProofId.DEPOSIT:
            return new rollup_deposit_proof_data_1.RollupDepositProofData(proof);
        case client_proofs_1.ProofId.WITHDRAW:
            return new rollup_withdraw_proof_data_1.RollupWithdrawProofData(proof);
        case client_proofs_1.ProofId.SEND:
            return new rollup_send_proof_data_1.RollupSendProofData(proof);
        case client_proofs_1.ProofId.ACCOUNT:
            return new rollup_account_proof_data_1.RollupAccountProofData(proof);
        case client_proofs_1.ProofId.DEFI_DEPOSIT:
            return new rollup_defi_deposit_proof_data_1.RollupDefiDepositProofData(proof);
        case client_proofs_1.ProofId.DEFI_CLAIM:
            return new rollup_defi_claim_proof_data_1.RollupDefiClaimProofData(proof);
        case client_proofs_1.ProofId.PADDING:
            return new rollup_padding_proof_data_1.RollupPaddingProofData(proof);
    }
};
const encodeInnerProof = (proof) => recoverInnerProof(proof).encode();
exports.encodeInnerProof = encodeInnerProof;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RlX2lubmVyX3Byb29mLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvbGx1cF9wcm9vZi9lbmNvZGVfaW5uZXJfcHJvb2YudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQTJDO0FBRTNDLDJFQUFxRTtBQUNyRSxpRkFBMEU7QUFDMUUscUZBQThFO0FBQzlFLDJFQUFxRTtBQUNyRSxxRUFBK0Q7QUFDL0QsNkVBQXVFO0FBQ3ZFLDJFQUFxRTtBQUVyRSxNQUFNLGlCQUFpQixHQUFHLENBQUMsS0FBcUIsRUFBRSxFQUFFO0lBQ2xELFFBQVEsS0FBSyxDQUFDLE9BQU8sRUFBRTtRQUNyQixLQUFLLHVCQUFPLENBQUMsT0FBTztZQUNsQixPQUFPLElBQUksa0RBQXNCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsS0FBSyx1QkFBTyxDQUFDLFFBQVE7WUFDbkIsT0FBTyxJQUFJLG9EQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVDLEtBQUssdUJBQU8sQ0FBQyxJQUFJO1lBQ2YsT0FBTyxJQUFJLDRDQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLEtBQUssdUJBQU8sQ0FBQyxPQUFPO1lBQ2xCLE9BQU8sSUFBSSxrREFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxLQUFLLHVCQUFPLENBQUMsWUFBWTtZQUN2QixPQUFPLElBQUksMkRBQTBCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0MsS0FBSyx1QkFBTyxDQUFDLFVBQVU7WUFDckIsT0FBTyxJQUFJLHVEQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLEtBQUssdUJBQU8sQ0FBQyxPQUFPO1lBQ2xCLE9BQU8sSUFBSSxrREFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUM1QztBQUNILENBQUMsQ0FBQztBQUVLLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxLQUFxQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUFqRixRQUFBLGdCQUFnQixvQkFBaUUifQ==