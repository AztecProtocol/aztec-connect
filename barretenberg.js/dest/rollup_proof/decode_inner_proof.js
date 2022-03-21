"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeInnerProof = void 0;
const client_proofs_1 = require("../client_proofs");
const rollup_account_proof_data_1 = require("./rollup_account_proof_data");
const rollup_defi_claim_proof_data_1 = require("./rollup_defi_claim_proof_data");
const rollup_defi_deposit_proof_data_1 = require("./rollup_defi_deposit_proof_data");
const rollup_deposit_proof_data_1 = require("./rollup_deposit_proof_data");
const rollup_padding_proof_data_1 = require("./rollup_padding_proof_data");
const rollup_send_proof_data_1 = require("./rollup_send_proof_data");
const rollup_withdraw_proof_data_1 = require("./rollup_withdraw_proof_data");
const recoverProof = (encoded) => {
    const proofId = encoded.readUInt8(0);
    switch (proofId) {
        case client_proofs_1.ProofId.DEPOSIT:
            return rollup_deposit_proof_data_1.RollupDepositProofData.decode(encoded);
        case client_proofs_1.ProofId.WITHDRAW:
            return rollup_withdraw_proof_data_1.RollupWithdrawProofData.decode(encoded);
        case client_proofs_1.ProofId.SEND:
            return rollup_send_proof_data_1.RollupSendProofData.decode(encoded);
        case client_proofs_1.ProofId.ACCOUNT:
            return rollup_account_proof_data_1.RollupAccountProofData.decode(encoded);
        case client_proofs_1.ProofId.DEFI_DEPOSIT:
            return rollup_defi_deposit_proof_data_1.RollupDefiDepositProofData.decode(encoded);
        case client_proofs_1.ProofId.DEFI_CLAIM:
            return rollup_defi_claim_proof_data_1.RollupDefiClaimProofData.decode(encoded);
        case client_proofs_1.ProofId.PADDING:
            return rollup_padding_proof_data_1.RollupPaddingProofData.decode(encoded);
    }
};
const decodeInnerProof = (encoded) => recoverProof(encoded);
exports.decodeInnerProof = decodeInnerProof;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb2RlX2lubmVyX3Byb29mLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvbGx1cF9wcm9vZi9kZWNvZGVfaW5uZXJfcHJvb2YudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQTJDO0FBQzNDLDJFQUFxRTtBQUNyRSxpRkFBMEU7QUFDMUUscUZBQThFO0FBQzlFLDJFQUFxRTtBQUNyRSwyRUFBcUU7QUFDckUscUVBQStEO0FBQy9ELDZFQUF1RTtBQUV2RSxNQUFNLFlBQVksR0FBRyxDQUFDLE9BQWUsRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckMsUUFBUSxPQUFPLEVBQUU7UUFDZixLQUFLLHVCQUFPLENBQUMsT0FBTztZQUNsQixPQUFPLGtEQUFzQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoRCxLQUFLLHVCQUFPLENBQUMsUUFBUTtZQUNuQixPQUFPLG9EQUF1QixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqRCxLQUFLLHVCQUFPLENBQUMsSUFBSTtZQUNmLE9BQU8sNENBQW1CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLEtBQUssdUJBQU8sQ0FBQyxPQUFPO1lBQ2xCLE9BQU8sa0RBQXNCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELEtBQUssdUJBQU8sQ0FBQyxZQUFZO1lBQ3ZCLE9BQU8sMkRBQTBCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BELEtBQUssdUJBQU8sQ0FBQyxVQUFVO1lBQ3JCLE9BQU8sdURBQXdCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELEtBQUssdUJBQU8sQ0FBQyxPQUFPO1lBQ2xCLE9BQU8sa0RBQXNCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ2pEO0FBQ0gsQ0FBQyxDQUFDO0FBRUssTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLE9BQWUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBRSxDQUFDO0FBQS9ELFFBQUEsZ0JBQWdCLG9CQUErQyJ9