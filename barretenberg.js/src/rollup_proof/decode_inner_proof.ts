import { ProofId } from '../client_proofs';
import { RollupAccountProofData } from './rollup_account_proof_data';
import { RollupDefiClaimProofData } from './rollup_defi_claim_proof_data';
import { RollupDefiDepositProofData } from './rollup_defi_deposit_proof_data';
import { RollupDepositProofData } from './rollup_deposit_proof_data';
import { RollupSendProofData } from './rollup_send_proof_data';
import { RollupWithdrawProofData } from './rollup_withdraw_proof_data';

const recoverProof = (encoded: Buffer) => {
  const proofId = encoded.readUInt8(0);
  switch (proofId) {
    case ProofId.DEPOSIT:
      return RollupDepositProofData.decode(encoded);
    case ProofId.WITHDRAW:
      return RollupWithdrawProofData.decode(encoded);
    case ProofId.SEND:
      return RollupSendProofData.decode(encoded);
    case ProofId.ACCOUNT:
      return RollupAccountProofData.decode(encoded);
    case ProofId.DEFI_DEPOSIT:
      return RollupDefiDepositProofData.decode(encoded);
    case ProofId.DEFI_CLAIM:
      return RollupDefiClaimProofData.decode(encoded);
  }
};

export const decodeInnerProof = (encoded: Buffer) => recoverProof(encoded)!;
