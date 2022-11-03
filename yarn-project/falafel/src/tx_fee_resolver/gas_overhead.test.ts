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
import { AssetGasLimit, getGasOverhead, getTxCallData } from './get_gas_overhead.js';

describe('get call data', () => {
  it('returns the correct call data for all tx types', () => {
    const expectedCallDataValues = [];

    // DEPOSIT call data is what's in the encoded proof + the ethereum signature
    const ethereumSigCallDataSize = 96;
    expectedCallDataValues[TxType.DEPOSIT] = RollupDepositProofData.ENCODED_LENGTH + ethereumSigCallDataSize;
    // The call data values for TRANSFER, WITHDRAW_TO_WALLET, WITHDRAW_HIGH_GAS, ACCOUNT, DEFI_DEPOSIT, DEFI_CLAIM
    // are just what is in the respective encoded proofs
    expectedCallDataValues[TxType.TRANSFER] = RollupSendProofData.ENCODED_LENGTH;
    expectedCallDataValues[TxType.WITHDRAW_TO_WALLET] = RollupWithdrawProofData.ENCODED_LENGTH;
    expectedCallDataValues[TxType.WITHDRAW_HIGH_GAS] = RollupWithdrawProofData.ENCODED_LENGTH;
    expectedCallDataValues[TxType.ACCOUNT] = RollupAccountProofData.ENCODED_LENGTH;
    expectedCallDataValues[TxType.DEFI_DEPOSIT] = RollupDefiDepositProofData.ENCODED_LENGTH;
    expectedCallDataValues[TxType.DEFI_CLAIM] = RollupDefiClaimProofData.ENCODED_LENGTH;

    const txTypes = Object.values(TxType).filter(v => !isNaN(Number(v)));
    for (let i = 0; i < txTypes.length; i++) {
      const expectedValue = expectedCallDataValues[i];
      const actualValue = getTxCallData(i);
      expect(expectedValue).toBeDefined();
      expect(actualValue).toBe(expectedValue);
    }
  });

  it('returns the correct gas data for all tx types using ETH', () => {
    const assetGasLimit: AssetGasLimit = {
      assetId: 0, // eth
      gasLimit: 30000,
    };
    const CALLDATA_GAS_PER_BYTE = 16;
    const expectedGasValues = [];

    // DEPOSIT gas is total call data ((proof + eth signature + offchain data) * GAS_PER_BYTE) + contract overhead
    // contract overhead is for message signing etc
    // offchain data is the same as a join split tx
    const ethereumSigCallDataSize = 96;
    const depositContractGasOverhead = 10500;
    const expectedDepositTotalCallData =
      RollupDepositProofData.ENCODED_LENGTH + ethereumSigCallDataSize + OffchainJoinSplitData.SIZE;
    const ethDepositCallDataGas = expectedDepositTotalCallData * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.DEPOSIT] = ethDepositCallDataGas + depositContractGasOverhead;
    // The gas values for TRANSFER, ACCOUNT, DEFI_DEPOSIT, DEFI_CLAIM
    // are the gas cost of sending the total call data for those txs
    expectedGasValues[TxType.TRANSFER] =
      (RollupSendProofData.ENCODED_LENGTH + OffchainJoinSplitData.SIZE) * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.ACCOUNT] =
      (RollupAccountProofData.ENCODED_LENGTH + OffchainAccountData.SIZE) * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.DEFI_DEPOSIT] =
      (RollupDefiDepositProofData.ENCODED_LENGTH + OffchainDefiDepositData.SIZE) * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.DEFI_CLAIM] =
      (RollupDefiClaimProofData.ENCODED_LENGTH + OffchainDefiClaimData.SIZE) * CALLDATA_GAS_PER_BYTE;

    // for WITHDRAW_TO_WALLET the gas cost is the cost of sending the total call data + the cost of sending the eth
    // the cost of sending eth is set at the cost of sending to a cold account that has previously been used (i.e. not a new account)
    const ethWithdrawContractGasOverhead = 10000;
    const ethWithdrawCallDataGas =
      (RollupWithdrawProofData.ENCODED_LENGTH + OffchainJoinSplitData.SIZE) * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.WITHDRAW_TO_WALLET] = ethWithdrawCallDataGas + ethWithdrawContractGasOverhead;

    // for WITHDRAW_HIGH_GAS the gas cost is the cost of sending the total call data + the cost of sending the eth
    // the cost of sending eth is set as the sum of the cost of sending eth to a cold account
    // plus the max gas allowed for sending to a contract (specified by the gas limit)
    // this gas limit will also then cover the cost of sending to an account that has never been used
    expectedGasValues[TxType.WITHDRAW_HIGH_GAS] =
      ethWithdrawCallDataGas + ethWithdrawContractGasOverhead + assetGasLimit.gasLimit;

    const txTypes = Object.values(TxType).filter(v => !isNaN(Number(v)));
    for (let i = 0; i < txTypes.length; i++) {
      const expectedValue = expectedGasValues[i];
      const actualValue = getGasOverhead(i, assetGasLimit);
      console.log(`tx type ${TxType[i]}, overhead ${actualValue}`);
      expect(expectedValue).toBeDefined();
      expect(actualValue).toBe(expectedValue);
    }
  });

  it('returns the correct gas data for all tx types using ERC20', () => {
    const assetGasLimit: AssetGasLimit = {
      assetId: 1, // not eth
      gasLimit: 60000,
    };
    const CALLDATA_GAS_PER_BYTE = 16;
    const expectedGasValues = [];

    // DEPOSIT gas is total call data ((proof + eth signature + offchain data) * GAS_PER_BYTE) + contract overhead
    // contract overhead is for message signing etc
    // offchain data is the same as a join split tx
    const ethereumSigCallDataSize = 96;
    const depositContractGasOverhead = 10500;
    const expectedDepositTotalCallData =
      RollupDepositProofData.ENCODED_LENGTH + ethereumSigCallDataSize + OffchainJoinSplitData.SIZE;
    const ethDepositCallDataGas = expectedDepositTotalCallData * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.DEPOSIT] = ethDepositCallDataGas + depositContractGasOverhead;
    // The gas values for TRANSFER, ACCOUNT, DEFI_DEPOSIT, DEFI_CLAIM
    // are the gas cost of sending the total call data for those txs
    expectedGasValues[TxType.TRANSFER] =
      (RollupSendProofData.ENCODED_LENGTH + OffchainJoinSplitData.SIZE) * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.ACCOUNT] =
      (RollupAccountProofData.ENCODED_LENGTH + OffchainAccountData.SIZE) * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.DEFI_DEPOSIT] =
      (RollupDefiDepositProofData.ENCODED_LENGTH + OffchainDefiDepositData.SIZE) * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.DEFI_CLAIM] =
      (RollupDefiClaimProofData.ENCODED_LENGTH + OffchainDefiClaimData.SIZE) * CALLDATA_GAS_PER_BYTE;

    // for WITHDRAW_TO_WALLET the gas cost is the cost of sending the total call data + the asset gas limit
    const withdrawCallDataGas =
      (RollupWithdrawProofData.ENCODED_LENGTH + OffchainJoinSplitData.SIZE) * CALLDATA_GAS_PER_BYTE;
    expectedGasValues[TxType.WITHDRAW_TO_WALLET] = withdrawCallDataGas + assetGasLimit.gasLimit;

    // for WITHDRAW_HIGH_GAS the gas cost is the cost of sending the total call data + the asset gas limit
    expectedGasValues[TxType.WITHDRAW_HIGH_GAS] = withdrawCallDataGas + assetGasLimit.gasLimit;

    const txTypes = Object.values(TxType).filter(v => !isNaN(Number(v)));
    for (let i = 0; i < txTypes.length; i++) {
      const expectedValue = expectedGasValues[i];
      const actualValue = getGasOverhead(i, assetGasLimit);
      expect(expectedValue).toBeDefined();
      expect(actualValue).toBe(expectedValue);
    }
  });
});
