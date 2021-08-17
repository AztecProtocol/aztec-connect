import { ProofId } from './proof_id';

export const getNumViewKeys = (proofId: ProofId) => {
  switch (proofId) {
    case ProofId.JOIN_SPLIT:
    case ProofId.DEFI_DEPOSIT:
      return 2;
    default:
      return 0;
  }
};
