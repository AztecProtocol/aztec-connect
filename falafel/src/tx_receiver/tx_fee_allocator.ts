import { TxFeeResolver } from '../tx_fee_resolver';
import { TxType } from '@aztec/barretenberg/blockchain';
import { Tx, TxGroupValidation } from '.';
import { DefiDepositProofData } from '@aztec/barretenberg/client_proofs';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxDao } from '../entity/tx';

export class TxFeeAllocator {
  constructor(private txFeeResolver: TxFeeResolver) {}

  private assetIsFeePaying(asset: number) {
    return this.txFeeResolver.isFeePayingAsset(asset);
  }

  public validateReceivedTxs(txs: Tx[], txTypes: TxType[]) {
    const result = {
      hasNonPayingDefi: false,
      hasNonFeePayingAssets: false,
      gasProvided: 0n,
      gasRequired: 0n,
    } as TxGroupValidation;

    const feePayingAssets = new Set<number>();

    // determine the fee paying asset type for this block of txs
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const feeAsset = tx.proof.txFeeAssetId.readUInt32BE(28);
      const isFeePayingAsset = this.assetIsFeePaying(feeAsset);
      if (isFeePayingAsset) {
        feePayingAssets.add(feeAsset);
      } else {
        if (txTypes[i] === TxType.DEFI_DEPOSIT) {
          result.hasNonPayingDefi = true;
        }
        result.hasNonFeePayingAssets = true;
      }
    }

    // there must be only one!
    if (feePayingAssets.size !== 1) {
      throw new Error('Transactions must have exactly 1 fee paying asset');
    }
    result.feePayingAsset = [...feePayingAssets][0];

    // calculate the gas required and that provided
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      if (txTypes[i] === TxType.DEFI_DEPOSIT) {
        const { bridgeId } = new DefiDepositProofData(tx.proof);
        // this call return BASE_TX_GAS + constants[DEFI_DEPOSIT] + BRIDGE_TX_GAS
        result.gasRequired += this.txFeeResolver.getBridgeTxGas(result.feePayingAsset, bridgeId.toBigInt());
        // this call return BASE_TX_GAS + constants[DEFI_CLAIM]
        result.gasRequired += this.txFeeResolver.getTxGas(result.feePayingAsset, TxType.DEFI_CLAIM);
      } else {
        result.gasRequired += this.txFeeResolver.getTxGas(result.feePayingAsset, txTypes[i]);
      }
      const feeAsset = tx.proof.txFeeAssetId.readUInt32BE(28);
      if (feeAsset === result.feePayingAsset) {
        result.gasProvided += this.txFeeResolver.getGasPaidForByFee(feeAsset, toBigIntBE(tx.proof.txFee));
      }
    }
    return result;
  }

  public reallocateGas(txDaos: TxDao[], txs: Tx[], txTypes: TxType[], validation: TxGroupValidation) {
    if (validation.gasProvided <= validation.gasRequired) {
      // no excess gas to be allocated
      return;
    }
    let providedGas = validation.gasProvided;
    if (!validation.hasNonFeePayingAssets) {
      // no non-fee paying assets. we simply calculate any excess gas for each tx and apply it to the DAO
      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        const fee = toBigIntBE(tx.proof.txFee);
        const gasProvidedThisTx = this.txFeeResolver.getGasPaidForByFee(validation.feePayingAsset, fee);
        if (txTypes[i] === TxType.DEFI_DEPOSIT) {
          // discount the gas required for the Deposit base cost, call data and bridge tx. also discount the claim base cost and call data
          const { bridgeId } = new DefiDepositProofData(tx.proof);
          // this call return BASE_TX_GAS + constants[DEFI_DEPOSIT] + BRIDGE_TX_GAS
          const gasCostDeposit = this.txFeeResolver.getBridgeTxGas(validation.feePayingAsset, bridgeId.toBigInt());
          // this call return BASE_TX_GAS + constants[DEFI_CLAIM]
          const gasCostClaim = this.txFeeResolver.getTxGas(validation.feePayingAsset, TxType.DEFI_CLAIM);
          // this gives us the excess to apply first to the bridge and then to the verification
          txDaos[i].excessGas = gasProvidedThisTx - (gasCostClaim + gasCostDeposit);
        } else {
          const gasCost = this.txFeeResolver.getTxGas(validation.feePayingAsset, txTypes[i]);
          txDaos[i].excessGas = gasProvidedThisTx - gasCost;
        }
      }
      return;
    }
    // we have at least one tx without a fee paying asset. we need to allocate excess gas from the
    // fee paying txs to the non fee payers
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const txType = txTypes[i];
      if (txType === TxType.DEFI_DEPOSIT) {
        // discount the gas required for the Deposit base cost, call data and bridge tx. also discount the claim base cost and call data
        const { bridgeId } = new DefiDepositProofData(tx.proof);
        // this call return BASE_TX_GAS + constants[DEFI_DEPOSIT] + BRIDGE_TX_GAS
        const gasCostDeposit = this.txFeeResolver.getBridgeTxGas(validation.feePayingAsset, bridgeId.toBigInt());
        // this call return BASE_TX_GAS + constants[DEFI_CLAIM]
        const gasCostClaim = this.txFeeResolver.getTxGas(validation.feePayingAsset, TxType.DEFI_CLAIM);
        providedGas -= gasCostDeposit + gasCostClaim;
      } else {
        providedGas -= this.txFeeResolver.getTxGas(validation.feePayingAsset, txType);
      }
    }
    if (providedGas === 0n) {
      // no excess, we can return
      return;
    }
    // if we have a non fee asset defi, allocate the excess gas to it
    if (validation.hasNonPayingDefi) {
      const defiIndex = txTypes.findIndex(tx => tx === TxType.DEFI_DEPOSIT);
      if (defiIndex === -1) {
        throw new Error(`Failed to allocate fee to Defi Deposit`);
      }
      txDaos[defiIndex].excessGas = providedGas;
      return;
    }
    // we have excess gas and no defi, find the first non-fee asset tx and allocate the excess to it
    const nonFeeIndex = txs.findIndex(tx => {
      const feeAsset = tx.proof.txFeeAssetId.readUInt32BE(28);
      return !this.assetIsFeePaying(feeAsset);
    });
    if (nonFeeIndex === -1) {
      throw new Error(`Failed to allocate fee to tx`);
    }
    txDaos[nonFeeIndex].excessGas = providedGas;
  }
}
