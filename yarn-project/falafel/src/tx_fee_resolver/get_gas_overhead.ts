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
const ETH_WITHDRAW_GAS_OVERHEAD = 10000;

export interface AssetGasLimit {
  assetId: number;
  gasLimit: number;
}

function getWithdrawToWalletGas(assetGasLimit: AssetGasLimit) {
  const callDataGasCost =
    (OffchainJoinSplitData.SIZE + getTxCallData(TxType.WITHDRAW_TO_WALLET)) * CALLDATA_GAS_PER_BYTE;
  // We set the contract overhead for eth to 10000.
  // This is the total cost of a transfer to a 'cold' account (one that has not been touched in that tx)
  // For ERC20 tokens, it's the asset's gas limit
  const contractOverhead = assetGasLimit.assetId == 0 ? ETH_WITHDRAW_GAS_OVERHEAD : assetGasLimit.gasLimit;
  return callDataGasCost + contractOverhead;
}

function getWithdrawHighGas(assetGasLimit: AssetGasLimit) {
  const callDataGasCost =
    (OffchainJoinSplitData.SIZE + getTxCallData(TxType.WITHDRAW_HIGH_GAS)) * CALLDATA_GAS_PER_BYTE;
  // We set the contract overhead for eth to 10000 + the eth gas limit.
  // The 10000 covers the cost of the value transfer.
  // The gas limit ensures we cover the cost of transferring to either a contract or an 'empty' account.
  // An 'empty' account is defined as code == nonce == balance == 0
  // For ERC20 tokens, it's the asset's gas limit
  const contractOverhead =
    assetGasLimit.assetId == 0 ? assetGasLimit.gasLimit + ETH_WITHDRAW_GAS_OVERHEAD : assetGasLimit.gasLimit;
  return callDataGasCost + contractOverhead;
}

export function getGasOverhead(txType: TxType, assetGasLimit: AssetGasLimit) {
  switch (txType) {
    case TxType.ACCOUNT:
      return (OffchainAccountData.SIZE + getTxCallData(txType)) * CALLDATA_GAS_PER_BYTE;
    case TxType.DEFI_CLAIM:
      return (OffchainDefiClaimData.SIZE + getTxCallData(txType)) * CALLDATA_GAS_PER_BYTE;
    case TxType.DEFI_DEPOSIT:
      return (OffchainDefiDepositData.SIZE + getTxCallData(txType)) * CALLDATA_GAS_PER_BYTE;
    case TxType.DEPOSIT:
      // 10500 gas signing message construction, ecrecover, and pending deposit storage update.
      return (
        (OffchainJoinSplitData.SIZE + getTxCallData(txType)) * CALLDATA_GAS_PER_BYTE + DEPOSIT_CONTRACT_GAS_CONSUMPTION
      );
    case TxType.TRANSFER:
      return (OffchainJoinSplitData.SIZE + getTxCallData(txType)) * CALLDATA_GAS_PER_BYTE;
    case TxType.WITHDRAW_HIGH_GAS:
      return getWithdrawHighGas(assetGasLimit);
    case TxType.WITHDRAW_TO_WALLET:
      return getWithdrawToWalletGas(assetGasLimit);
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
    case TxType.WITHDRAW_HIGH_GAS:
    case TxType.WITHDRAW_TO_WALLET:
      return RollupWithdrawProofData.ENCODED_LENGTH;
  }
}
