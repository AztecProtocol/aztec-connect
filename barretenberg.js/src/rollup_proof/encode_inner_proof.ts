import { ProofId } from '../client_proofs';
import { InnerProofData } from './inner_proof';
import { RollupAccountProofData } from './rollup_account_proof_data';
import { RollupDefiClaimProofData } from './rollup_defi_claim_proof_data';
import { RollupDefiDepositProofData } from './rollup_defi_deposit_proof_data';
import { RollupDepositProofData } from './rollup_deposit_proof_data';
import { RollupSendProofData } from './rollup_send_proof_data';
import { RollupWithdrawProofData } from './rollup_withdraw_proof_data';
import { RollupPaddingProofData } from './rollup_padding_proof_data';

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
