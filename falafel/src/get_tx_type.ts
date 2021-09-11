import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { ClientProofData, JoinSplitClientProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { InnerProofData } from '@aztec/barretenberg/rollup_proof';

export async function getTxTypeFromProofData(proofData: ClientProofData, blockchain: Blockchain) {
  switch (proofData.proofId) {
    case ProofId.ACCOUNT:
      return TxType.ACCOUNT;
    case ProofId.DEFI_DEPOSIT:
      return TxType.DEFI_DEPOSIT;
    case ProofId.DEFI_CLAIM:
      return TxType.DEFI_CLAIM;
  }

  const { publicInput, publicOutput, outputOwner } = new JoinSplitClientProofData(proofData);

  if (publicInput > 0) {
    return TxType.DEPOSIT;
  } else if (publicOutput > 0) {
    return (await blockchain.isContract(outputOwner)) ? TxType.WITHDRAW_TO_CONTRACT : TxType.WITHDRAW_TO_WALLET;
  } else {
    return TxType.TRANSFER;
  }
}

/**
 * A bit meh, but when restoring we don't need to know if it was a withdraw to a contract of address, so skip
 * querying the blockchain and just set it as a wallet withdraw.
 */
export function getTxTypeFromInnerProofData(proofData: InnerProofData) {
  switch (proofData.proofId) {
    case ProofId.ACCOUNT:
      return TxType.ACCOUNT;
    case ProofId.DEFI_DEPOSIT:
      return TxType.DEFI_DEPOSIT;
    case ProofId.DEFI_CLAIM:
      return TxType.DEFI_CLAIM;
  }

  const publicInput = toBigIntBE(proofData.publicInput);
  const publicOutput = toBigIntBE(proofData.publicOutput);

  if (publicInput > 0) {
    return TxType.DEPOSIT;
  } else if (publicOutput > 0) {
    return TxType.WITHDRAW_TO_WALLET;
  } else {
    return TxType.TRANSFER;
  }
}
