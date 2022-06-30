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

const CALLDATA_GAS_PER_BYTE = 16;
const SIGNATURE_CALLDATA_SIZE = 96;
const DEPOSIT_CONTRACT_GAS_CONSUMPTION = 10500;
const ETH_WALLET_WITHDRAW_GAS = 10000;

export interface AssetGasLimit {
  assetId: number;
  gasLimit: number;
}

export function getGasOverhead(txType: TxType, assetGasLimit: AssetGasLimit) {
  const gasPerByte = CALLDATA_GAS_PER_BYTE;
  switch (txType) {
    case TxType.ACCOUNT:
      return (OffchainAccountData.SIZE + getTxCallData(txType)) * gasPerByte;
    case TxType.DEFI_CLAIM:
      return (OffchainDefiClaimData.SIZE + getTxCallData(txType)) * gasPerByte;
    case TxType.DEFI_DEPOSIT:
      return (OffchainDefiDepositData.SIZE + getTxCallData(txType)) * gasPerByte;
    case TxType.DEPOSIT:
      // 10500 gas signing message construction, ecrecover, and pending deposit storage update.
      return (OffchainJoinSplitData.SIZE + getTxCallData(txType)) * gasPerByte + DEPOSIT_CONTRACT_GAS_CONSUMPTION;
    case TxType.TRANSFER:
      return (OffchainJoinSplitData.SIZE + getTxCallData(txType)) * gasPerByte;
    case TxType.WITHDRAW_TO_CONTRACT:
      return assetGasLimit.gasLimit + (OffchainJoinSplitData.SIZE + getTxCallData(txType)) * gasPerByte;
    case TxType.WITHDRAW_TO_WALLET:
      return (
        (assetGasLimit.assetId == 0 ? ETH_WALLET_WITHDRAW_GAS : assetGasLimit.gasLimit) +
        (OffchainJoinSplitData.SIZE + getTxCallData(txType)) * gasPerByte
      );
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
      return RollupDepositProofData.ENCODED_LENGTH + SIGNATURE_CALLDATA_SIZE;
    case TxType.TRANSFER:
      return RollupSendProofData.ENCODED_LENGTH;
    case TxType.WITHDRAW_TO_CONTRACT:
    case TxType.WITHDRAW_TO_WALLET:
      return RollupWithdrawProofData.ENCODED_LENGTH;
  }
}
