import { ProofId } from '../client_proofs';
import { AccountProofData } from './account_proof_data';
import { DefiClaimProofData } from './defi_claim_proof_data';
import { DefiDepositProofData } from './defi_deposit_proof_data';
import { InnerProofData } from './inner_proof';
import { JoinSplitProofData } from './join_split_proof_data';
import { TxEncoding } from './tx_encoding';

const recoverInnerProof = (proof: InnerProofData) => {
  switch (proof.proofId) {
    case ProofId.JOIN_SPLIT:
      return new JoinSplitProofData(proof);
    case ProofId.ACCOUNT:
      return new AccountProofData(proof);
    case ProofId.DEFI_DEPOSIT:
      return new DefiDepositProofData(proof);
    case ProofId.DEFI_CLAIM:
      return new DefiClaimProofData(proof);
  }
};

export const encodeInnerProof = (proof: InnerProofData) => recoverInnerProof(proof).encode();

export const getEncodedLength = (encoding: TxEncoding) => {
  switch (encoding) {
    case TxEncoding.ACCOUNT:
      return AccountProofData.ENCODED_LENGTH;
    case TxEncoding.DEFI_DEPOSIT:
      return DefiDepositProofData.ENCODED_LENGTH;
    case TxEncoding.DEFI_CLAIM:
      return DefiClaimProofData.ENCODED_LENGTH;
    default:
      return JoinSplitProofData.ENCODED_LENGTH(encoding);
  }
};
