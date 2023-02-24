import { ProofId } from '../client_proofs/index.js';
import { InnerProofData } from './inner_proof.js';
import { RollupAccountProofData } from './rollup_account_proof_data.js';
import { RollupDefiClaimProofData } from './rollup_defi_claim_proof_data.js';
import { RollupDefiDepositProofData } from './rollup_defi_deposit_proof_data.js';
import { RollupDepositProofData } from './rollup_deposit_proof_data.js';
import { RollupSendProofData } from './rollup_send_proof_data.js';
import { RollupWithdrawProofData } from './rollup_withdraw_proof_data.js';
import { RollupPaddingProofData } from './rollup_padding_proof_data.js';

const recoverInnerProof = (proof: InnerProofData) => {
  switch (proof.proofId) {
    case ProofId.DEPOSIT:
      return new RollupDepositProofData(proof);
    case ProofId.WITHDRAW:
      return new RollupWithdrawProofData(proof);
    case ProofId.SEND:
      return new RollupSendProofData(proof);
    case ProofId.ACCOUNT:
      return new RollupAccountProofData(proof);
    case ProofId.DEFI_DEPOSIT:
      return new RollupDefiDepositProofData(proof);
    case ProofId.DEFI_CLAIM:
      return new RollupDefiClaimProofData(proof);
    case ProofId.PADDING:
      return new RollupPaddingProofData(proof);
  }
};

export const encodeInnerProof = (proof: InnerProofData) => recoverInnerProof(proof)!.encode();
