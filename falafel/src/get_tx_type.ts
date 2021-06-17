import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { JoinSplitProofData, ProofData, ProofId } from '@aztec/barretenberg/client_proofs/proof_data';
import { InnerProofData } from '@aztec/barretenberg/rollup_proof';
import { toBigIntBE } from 'bigint-buffer';

export async function getTxTypeFromProofData(proofData: ProofData, blockchain: Blockchain) {
  if (proofData.proofId == ProofId.ACCOUNT) {
    return TxType.ACCOUNT;
  }

  const { publicInput, publicOutput, outputOwner } = new JoinSplitProofData(proofData);

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
  if (proofData.proofId == ProofId.ACCOUNT) {
    return TxType.ACCOUNT;
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
