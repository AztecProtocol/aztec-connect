import { AccountProofData } from './account_proof_data';
import { DefiClaimProofData } from './defi_claim_proof_data';
import { DefiDepositProofData } from './defi_deposit_proof_data';
import { JoinSplitProofData } from './join_split_proof_data';
import { TxEncoding } from './tx_encoding';

const recoverProof = (encoded: Buffer) => {
  const encoding = encoded.readUInt8(0);
  switch (encoding) {
    case TxEncoding.ACCOUNT:
      return AccountProofData.decode(encoded);
    case TxEncoding.DEFI_DEPOSIT:
      return DefiDepositProofData.decode(encoded);
    case TxEncoding.DEFI_CLAIM:
      return DefiClaimProofData.decode(encoded);
    default:
      return JoinSplitProofData.decode(encoded);
  }
};

export const decodeInnerProof = (encoded: Buffer) => recoverProof(encoded).proofData;
