import { TxType } from '@aztec/barretenberg/blockchain';
import {
  OffchainAccountData,
  OffchainDefiClaimData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import {
  RollupAccountProofData,
  RollupDefiClaimProofData,
  RollupDefiDepositProofData,
  RollupDepositProofData,
  RollupSendProofData,
  RollupWithdrawProofData,
} from '@aztec/barretenberg/rollup_proof';

export function getGasOverhead(txType: TxType, gasLimit: number) {
  const gasPerByte = 16;
  switch (txType) {
    case TxType.ACCOUNT:
      return (OffchainAccountData.SIZE + getTxCallData(txType)) * gasPerByte;
    case TxType.DEFI_CLAIM:
      return (OffchainDefiClaimData.SIZE + getTxCallData(txType)) * gasPerByte;
    case TxType.DEFI_DEPOSIT:
      return (OffchainDefiDepositData.SIZE + getTxCallData(txType)) * gasPerByte;
    case TxType.DEPOSIT:
      // 10500 gas signing message construction, ecrecover, and pending deposit storage update.
      return (OffchainJoinSplitData.SIZE + getTxCallData(txType)) * gasPerByte + 10500;
    case TxType.TRANSFER:
      return (OffchainJoinSplitData.SIZE + getTxCallData(txType)) * gasPerByte;
    case TxType.WITHDRAW_TO_CONTRACT:
    case TxType.WITHDRAW_TO_WALLET:
      return gasLimit + (OffchainJoinSplitData.SIZE + getTxCallData(txType)) * gasPerByte;
  }
}

export function getTxCallData(txType: TxType) {
  switch (txType) {
    case TxType.ACCOUNT:
      return RollupAccountProofData.ENCODED_LENGTH;
    case TxType.DEFI_CLAIM:
      return RollupDefiClaimProofData.ENCODED_LENGTH;
    case TxType.DEFI_DEPOSIT:
      return RollupDefiDepositProofData.ENCODED_LENGTH;
    case TxType.DEPOSIT:
      // 96 bytes for signature on top of the rollup proof data
      return RollupDepositProofData.ENCODED_LENGTH + 96;
    case TxType.TRANSFER:
      return RollupSendProofData.ENCODED_LENGTH;
    case TxType.WITHDRAW_TO_CONTRACT:
    case TxType.WITHDRAW_TO_WALLET:
      return RollupWithdrawProofData.ENCODED_LENGTH;
  }
}
