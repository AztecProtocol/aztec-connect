import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { DefiDepositProofData } from '@aztec/barretenberg/client_proofs';
import { TxDao } from '../entity';
import { TxFeeResolver } from '../tx_fee_resolver';
import { Tx } from './tx';

interface TxGroupValidation {
  hasFeelessTxs: boolean;
  feePayingAsset: number;
  gasRequired: number;
  gasProvided: number;
}

export class TxFeeAllocator {
  constructor(private txFeeResolver: TxFeeResolver) {}

  public validateReceivedTxs(txs: Tx[], txTypes: TxType[]): TxGroupValidation {
    const feePayingAssets = new Set<number>();
    let hasFeelessTxs = false;
    // determine the fee paying asset type for this block of txs
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const txFeeAssetId = tx.proof.txFeeAssetId.readUInt32BE(28);
      const isFeePayingAsset = this.txFeeResolver.isFeePayingAsset(txFeeAssetId);
      const txFee = toBigIntBE(tx.proof.txFee);
      if (isFeePayingAsset && txFee) {
        feePayingAssets.add(txFeeAssetId);
      } else {
        hasFeelessTxs = true;
      }
    }

    // there must be only one!
    if (feePayingAssets.size !== 1) {
      throw new Error('Transactions must have exactly 1 fee paying asset.');
    }

    const feePayingAsset = [...feePayingAssets][0];
    let gasRequired = 0;
    let gasProvided = 0;
    // calculate the gas required and that provided
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      if (txTypes[i] === TxType.DEFI_DEPOSIT) {
        const { bridgeId } = new DefiDepositProofData(tx.proof);
        // this call return BASE_TX_GAS + constants[DEFI_DEPOSIT] + BRIDGE_TX_GAS
        gasRequired += this.txFeeResolver.getBridgeTxGas(feePayingAsset, bridgeId.toBigInt());
        // this call return BASE_TX_GAS + constants[DEFI_CLAIM]
        gasRequired += this.txFeeResolver.getTxGas(feePayingAsset, TxType.DEFI_CLAIM);
      } else {
        gasRequired += this.txFeeResolver.getTxGas(feePayingAsset, txTypes[i]);
      }

      const txFeeAssetId = tx.proof.txFeeAssetId.readUInt32BE(28);
      if (txFeeAssetId === feePayingAsset) {
        gasProvided += this.txFeeResolver.getGasPaidForByFee(txFeeAssetId, toBigIntBE(tx.proof.txFee));
      }
    }

    return {
      hasFeelessTxs,
      feePayingAsset,
      gasProvided,
      gasRequired,
    };
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

    // We have at least one tx without a fee. We need to allocate excess gas from the
    // fee paying txs to the non fee payers.
    let providedGas = validation.gasProvided;
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
    if (!providedGas) {
      // no excess, we can return
      return;
    }

    // if we have a defi, allocate the excess gas to it
    const defiIndex = txTypes.findIndex(tx => tx === TxType.DEFI_DEPOSIT);
    if (defiIndex >= 0) {
      txDaos[defiIndex].excessGas = providedGas;
      return;
    }

    // We have excess gas and no defi, find the first feeless tx and allocate the excess to it.
    const nonFeeIndex = txs.findIndex(tx => {
      const txFeeAssetId = tx.proof.txFeeAssetId.readUInt32BE(28);
      const txFee = toBigIntBE(tx.proof.txFee);
      return !this.txFeeResolver.isFeePayingAsset(txFeeAssetId) || !txFee;
    });
    if (nonFeeIndex === -1) {
      throw new Error(`Failed to allocate fee to tx`);
    }
    txDaos[nonFeeIndex].excessGas = providedGas;
  }
}
