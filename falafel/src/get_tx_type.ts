import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { JoinSplitProofData, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { InnerProofData } from '@aztec/barretenberg/rollup_proof';

export async function getTxTypeFromProofData(proofData: ProofData, blockchain: Blockchain) {
  switch (proofData.proofId) {
    case ProofId.DEPOSIT:
      return TxType.DEPOSIT;
    case ProofId.SEND:
      return TxType.TRANSFER;
    case ProofId.ACCOUNT:
      return TxType.ACCOUNT;
    case ProofId.DEFI_DEPOSIT:
      return TxType.DEFI_DEPOSIT;
    case ProofId.DEFI_CLAIM:
      return TxType.DEFI_CLAIM;
  }

  const { publicOwner } = new JoinSplitProofData(proofData);
  return (await blockchain.isContract(publicOwner)) ? TxType.WITHDRAW_TO_CONTRACT : TxType.WITHDRAW_TO_WALLET;
}

/**
 * A bit meh, but when restoring we don't need to know if it was a withdraw to a contract of address, so skip
 * querying the blockchain and just set it as a wallet withdraw.
 */
export function getTxTypeFromInnerProofData(proofData: InnerProofData) {
  switch (proofData.proofId) {
    case ProofId.DEPOSIT:
      return TxType.DEPOSIT;
    case ProofId.SEND:
      return TxType.TRANSFER;
    case ProofId.ACCOUNT:
      return TxType.ACCOUNT;
    case ProofId.DEFI_DEPOSIT:
      return TxType.DEFI_DEPOSIT;
    case ProofId.DEFI_CLAIM:
      return TxType.DEFI_CLAIM;
  }

  return TxType.WITHDRAW_TO_WALLET;
}
