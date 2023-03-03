import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { DefiDepositProofData } from '@aztec/barretenberg/client_proofs';
import { createLogger } from '@aztec/barretenberg/log';
import { TxDao } from '../entity/index.js';
import { TxFeeResolver } from '../tx_fee_resolver/index.js';
import { Tx } from './tx.js';

interface TxGroupValidation {
  hasFeelessTxs: boolean;
  feePayingAsset: number;
  gasRequired: number;
  gasProvided: number;
}

export class TxFeeAllocator {
  constructor(private txFeeResolver: TxFeeResolver, private log = createLogger('TxFeeAllocator')) {}

  public validateReceivedTxs(txs: Tx[], txTypes: TxType[], exitOnly = false): TxGroupValidation {
    const feePayingAssets = new Set<number>();
    let hasFeelessTxs = false;
    // determine the fee paying asset type for this block of txs
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const txFeeAssetId = tx.proof.feeAssetId;
      const isFeePayingAsset = this.txFeeResolver.isFeePayingAsset(txFeeAssetId);
      const txFee = toBigIntBE(tx.proof.txFee);
      if (isFeePayingAsset && txFee) {
        feePayingAssets.add(txFeeAssetId);
      } else {
        hasFeelessTxs = true;
      }
    }

    // there must be only one!
    const allowedFeeAssetCount = exitOnly ? [0, 1] : [1];
    if (!allowedFeeAssetCount.includes(feePayingAssets.size)) {
      throw new Error("Transactions don't have the correct number of fee paying assets");
    }

    const feePayingAsset = [...feePayingAssets][0];
    let gasRequired = 0;
    let gasProvided = 0;
    // calculate the gas required and that provided
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const txAssetId = tx.proof.feeAssetId;

      // AC SUNSET CODE
      if (exitOnly) {
        gasRequired = 0;
      } else if (txTypes[i] === TxType.DEFI_DEPOSIT) {
        const { bridgeCallData } = new DefiDepositProofData(tx.proof);
        // this call return BASE_TX_GAS + constants[DEFI_DEPOSIT] + BRIDGE_TX_GAS
        gasRequired += this.txFeeResolver.getAdjustedBridgeTxGas(txAssetId, bridgeCallData.toBigInt());
        // this call return BASE_TX_GAS + constants[DEFI_CLAIM]
        gasRequired += this.txFeeResolver.getAdjustedTxGas(txAssetId, TxType.DEFI_CLAIM);
      } else {
        gasRequired += this.txFeeResolver.getAdjustedTxGas(txAssetId, txTypes[i]);
      }

      if (txAssetId === feePayingAsset) {
        gasProvided += this.txFeeResolver.getGasPaidForByFee(feePayingAsset, toBigIntBE(tx.proof.txFee));
      }
    }

    return {
      hasFeelessTxs,
      feePayingAsset,
      gasProvided,
      gasRequired,
    };
  }

  public printFeeBreakdown(txs: Tx[], txTypes: TxType[]) {
    const feePayingAssets = new Set<number>();
    let hasFeelessTxs = false;
    // determine the fee paying asset type for this block of txs
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const txFeeAssetId = tx.proof.feeAssetId;
      const isFeePayingAsset = this.txFeeResolver.isFeePayingAsset(txFeeAssetId);
      const txFee = toBigIntBE(tx.proof.txFee);
      if (isFeePayingAsset && txFee) {
        feePayingAssets.add(txFeeAssetId);
      } else {
        hasFeelessTxs = true;
      }
    }

    const feePayingAsset = [...feePayingAssets][0];
    this.log(`Generating fee breakdown, fee paying asset: ${feePayingAsset}, feeless txs: ${hasFeelessTxs}`);
    let gasRequired = 0;
    let gasProvided = 0;
    let totalFeeProvided = 0n;
    let totalFeeRequired = 0n;
    // calculate the gas required and that provided
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const txAssetId = tx.proof.feeAssetId;
      const txFee = toBigIntBE(tx.proof.txFee);
      let gasPaidFor = 0;
      if (txTypes[i] === TxType.DEFI_DEPOSIT) {
        const { bridgeCallData } = new DefiDepositProofData(tx.proof);
        // this call return BASE_TX_GAS + constants[DEFI_DEPOSIT] + BRIDGE_TX_GAS
        const bridgeGas = this.txFeeResolver.getAdjustedBridgeTxGas(txAssetId, bridgeCallData.toBigInt());
        // this call return BASE_TX_GAS + constants[DEFI_CLAIM]
        const claimGas = this.txFeeResolver.getAdjustedTxGas(txAssetId, TxType.DEFI_CLAIM);
        const gasForThisTx = bridgeGas + claimGas;
        gasRequired += gasForThisTx;

        const feeRequiredForThisTx = this.txFeeResolver.getTxFeeFromGas(feePayingAsset, gasForThisTx);
        totalFeeRequired += feeRequiredForThisTx;
        this.log(
          `Tx ${i + 1}/${txs.length}, type: ${
            TxType[txTypes[i]]
          }, fee/asset id ${txFee}/${txAssetId}, gas cost for tx: ${gasForThisTx}, fee required: ${feeRequiredForThisTx}`,
        );
        this.log(`Bridge ${bridgeCallData.toString()} gas: ${bridgeGas}, claim gas: ${claimGas}`);
      } else {
        const gasForThisTx = this.txFeeResolver.getAdjustedTxGas(txAssetId, txTypes[i]);
        gasRequired += gasForThisTx;
        const feeRequiredForThisTx = this.txFeeResolver.getTxFeeFromGas(feePayingAsset, gasForThisTx);
        totalFeeRequired += feeRequiredForThisTx;
        this.log(
          `Tx ${i + 1}/${txs.length}, type: ${
            TxType[txTypes[i]]
          }, fee/asset id ${txFee}/${txAssetId}, gas cost for tx: ${gasForThisTx}, fee required: ${feeRequiredForThisTx}`,
        );
      }

      if (txAssetId === feePayingAsset) {
        gasPaidFor = this.txFeeResolver.getGasPaidForByFee(feePayingAsset, txFee);
        gasProvided += gasPaidFor;
        totalFeeProvided += txFee;
      }
      this.log(`Gas paid for by tx ${i + 1}/${txs.length}: ${gasPaidFor}`);
    }
    this.log(
      `Gas required/provided: ${gasRequired}/${gasProvided}, gas balance: ${
        gasProvided - gasRequired
      }, fee required/provided: ${totalFeeRequired}/${totalFeeProvided}`,
    );
  }

  public reallocateGas(txDaos: TxDao[], txs: Tx[], txTypes: TxType[], validation: TxGroupValidation) {
    if (validation.gasProvided <= validation.gasRequired) {
      // no excess gas to be allocated
      return;
    }

    if (!validation.hasFeelessTxs) {
      // No feeless txs. We simply calculate any excess gas for each tx and apply it to the DAO.
      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        const txFeeAssetId = tx.proof.feeAssetId;
        const fee = toBigIntBE(tx.proof.txFee);
        const gasProvidedThisTx = this.txFeeResolver.getGasPaidForByFee(txFeeAssetId, fee);
        if (txTypes[i] === TxType.DEFI_DEPOSIT) {
          // discount the gas required for the Deposit base cost, call data and bridge tx. also discount the claim base cost and call data
          const { bridgeCallData } = new DefiDepositProofData(tx.proof);
          // this call return BASE_TX_GAS + constants[DEFI_DEPOSIT] + BRIDGE_TX_GAS
          const gasCostDeposit = this.txFeeResolver.getAdjustedBridgeTxGas(txFeeAssetId, bridgeCallData.toBigInt());
          // this call return BASE_TX_GAS + constants[DEFI_CLAIM]
          const gasCostClaim = this.txFeeResolver.getAdjustedTxGas(txFeeAssetId, TxType.DEFI_CLAIM);
          // this gives us the excess to apply first to the bridge and then to the verification
          txDaos[i].excessGas = Math.max(0, gasProvidedThisTx - (gasCostClaim + gasCostDeposit));
        } else {
          const gasCost = this.txFeeResolver.getAdjustedTxGas(txFeeAssetId, txTypes[i]);
          txDaos[i].excessGas = Math.max(0, gasProvidedThisTx - gasCost);
        }
      }
      return;
    }

    // We have at least one tx without a fee. We need to allocate excess gas from the
    // fee paying txs to the non fee payers.
    let providedGas = validation.gasProvided;
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const txType = txTypes[i];
      if (txType === TxType.DEFI_DEPOSIT) {
        // discount the gas required for the Deposit base cost, call data and bridge tx. also discount the claim base cost and call data
        const { bridgeCallData } = new DefiDepositProofData(tx.proof);
        const { inputAssetIdA: inputAssetId } = bridgeCallData;
        // this call return BASE_TX_GAS + constants[DEFI_DEPOSIT] + BRIDGE_TX_GAS
        const gasCostDeposit = this.txFeeResolver.getAdjustedBridgeTxGas(inputAssetId, bridgeCallData.toBigInt());
        // this call return BASE_TX_GAS + constants[DEFI_CLAIM]
        const gasCostClaim = this.txFeeResolver.getAdjustedTxGas(inputAssetId, TxType.DEFI_CLAIM);
        providedGas -= gasCostDeposit + gasCostClaim;
      } else {
        const txAssetId = tx.proof.feeAssetId;
        providedGas -= this.txFeeResolver.getAdjustedTxGas(txAssetId, txType);
      }
    }
    if (!providedGas) {
      // no excess, we can return
      return;
    }

    // if we have a defi, allocate the excess gas to it
    const defiIndex = txTypes.findIndex(tx => tx === TxType.DEFI_DEPOSIT);
    if (defiIndex >= 0) {
      txDaos[defiIndex].excessGas = Math.max(0, providedGas);
      return;
    }

    // We have excess gas and no defi, find the first feeless tx and allocate the excess to it.
    const nonFeeIndex = txs.findIndex(tx => {
      const txFee = toBigIntBE(tx.proof.txFee);
      return !this.txFeeResolver.isFeePayingAsset(tx.proof.feeAssetId) || !txFee;
    });
    if (nonFeeIndex === -1) {
      throw new Error(`Failed to allocate fee to tx`);
    }
    txDaos[nonFeeIndex].excessGas = Math.max(0, providedGas);
  }
}
