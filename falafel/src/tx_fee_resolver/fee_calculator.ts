import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { createLogger } from '@aztec/barretenberg/log';
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
import { PriceTracker } from './price_tracker';
import { roundUp } from './round_up';

const allTxTypes = [
  TxType.DEPOSIT,
  TxType.TRANSFER,
  TxType.WITHDRAW_TO_WALLET,
  TxType.WITHDRAW_TO_CONTRACT,
  TxType.ACCOUNT,
  TxType.DEFI_DEPOSIT,
  TxType.DEFI_CLAIM,
];

export class FeeCalculator {
  constructor(
    private readonly priceTracker: PriceTracker,
    private readonly blockchain: Blockchain,
    private readonly verificationGas: number,
    private readonly maxFeeGasPrice: bigint,
    private readonly feeGasPriceMultiplier: number,
    private readonly txsPerRollup: number,
    private readonly callDataPerRollup: number,
    private readonly numSignificantFigures = 0,
    private readonly gasPerByte = 16,
    private readonly log = createLogger('FeeCalculator'),
  ) {
    const txTypes = Object.values(TxType).filter(v => !isNaN(Number(v)));
    for (let i = 0; i < txTypes.length; i++) {
      this.log(
        `${TxType[i]} call data: ${this.getTxCallData(i)}, adj/base gas: ${this.getAdjustedBaseVerificationGas(
          i,
        )}/${this.getUnadjustedBaseVerificationGas()}, ETH tx gas: ${this.getGasOverheadForTxType(
          0,
          i,
        )}, max txs per rollup: ${this.getNumAdjustedTxsPerRollup(i)}`,
      );
    }
  }

  public getMinTxFee(txAssetId: number, txType: TxType, feeAssetId: number) {
    return this.getFeeConstant(txAssetId, txType, feeAssetId, true) + this.getBaseFee(feeAssetId, txType, true);
  }

  public getTxFees(txAssetId: number, feeAssetId: number) {
    return allTxTypes.map(txType => [
      {
        assetId: feeAssetId,
        value: this.getBaseFee(feeAssetId, txType) + this.getFeeConstant(txAssetId, txType, feeAssetId),
      },
      {
        assetId: feeAssetId,
        value:
          this.getEmptySlotFee(feeAssetId) * BigInt(this.txsPerRollup) +
          this.getFeeConstant(txAssetId, txType, feeAssetId),
      },
    ]);
  }

  private getAsset(assetId: number) {
    const assets = this.getAssets();
    return assets[assetId];
  }

  private getAssets() {
    return this.blockchain.getBlockchainStatus().assets;
  }

  private isValidAsset(assetId: number) {
    const assets = this.getAssets();
    return assetId < assets.length;
  }

  public getTxFeeFromGas(gas: number, assetId: number) {
    return this.toAssetPrice(assetId, gas, false);
  }

  public getGasPaidForByFee(assetId: number, fee: bigint) {
    const assetCostInWei = this.priceTracker.getAssetPrice(assetId);
    // Our feeGasPriceMultiplier can be accurate to 8 decimal places (e.g. 0.00000001).
    const multiplierPrecision = 10 ** 8;
    const feeGasPriceMultiplier = BigInt(this.feeGasPriceMultiplier * multiplierPrecision);
    const gasPriceInWei = (this.priceTracker.getMinGasPrice() * feeGasPriceMultiplier) / BigInt(multiplierPrecision);
    const { decimals } = this.getAsset(assetId);
    const scaleFactor = 10n ** BigInt(decimals);
    // the units here are inconsistent, fee is in base units, asset cost in wei is not
    // the result is a number that is 10n ** BigInt(decimals) too large.
    // but we want to keep numbers as large as possible until the end where we will scale back down
    const amountOfWeiProvided = assetCostInWei * fee;
    const gasPaidForUnscaled = amountOfWeiProvided / gasPriceInWei;
    const gasPaidforScaled = gasPaidForUnscaled / scaleFactor;
    return Number(gasPaidforScaled);
  }

  // this function returns the shared cost of the verifier for a single slot in the rollup (unadjusted cost)
  // plus the tx specific adjustment required to account for the potentially reduced number of txs of the given type
  // than can fit into the rollup
  // hence 'adjusted' base gas
  public getAdjustedBaseVerificationGas(txType: TxType) {
    return this.getUnadjustedBaseVerificationGas() + this.getTxGasAdjustmentValue(txType);
  }

  // the purpose of this function is to return the gas cost of the verifier
  // shared across all of the slots in the rollup
  // hence 'unadjusted' base gas
  public getUnadjustedBaseVerificationGas() {
    return Math.ceil(this.verificationGas / this.txsPerRollup);
  }

  // this is the calculated adjustment value for a given tx type
  // this is used to adjust the amount of base gas a tx consumes
  // based on the fact that potentially fewer of them can fit into a rollup
  public getTxGasAdjustmentValue(txType: TxType) {
    const unadjusted = this.verificationGas / this.txsPerRollup;
    const numAdjustedTxs = this.getNumAdjustedTxsPerRollup(txType);
    const adjusted = this.verificationGas / numAdjustedTxs;
    const difference = adjusted - unadjusted;
    return Math.ceil(difference);
  }

  // this calculates the number of txs of the given type that can fit into a rollup
  // it is essentially the minimum of the following
  // 1. the maximum number of slots in the rollup
  // 2. the maximum number of txs of that type that can fit into a single ethereum tx calldata
  // note the -1 when calculating the number of txs.
  // this is because we will inevitably need to publish rollups that are not quite 'full' of calldata
  // as soon as there is not enough calldata available for all of our tx types then we need to publish
  // otherwise we could encounter a situation where a user pays for an instant tx that won't fit
  private getNumAdjustedTxsPerRollup(txType: TxType) {
    const callDataForTx = this.getTxCallData(txType);
    const numTxsAccountingForCallData = Math.floor(this.callDataPerRollup / callDataForTx) - 1;
    return Math.min(numTxsAccountingForCallData, this.txsPerRollup);
  }

  // the full gas cost of the tx, including the base gas adjustment
  public getAdjustedTxGas(assetId: number, txType: TxType) {
    return this.getAdjustedBaseVerificationGas(txType) + this.getGasOverheadForTxType(assetId, txType);
  }

  // the full gas cost of the tx, excluding the base gas adjustment
  public getUnadjustedTxGas(assetId: number, txType: TxType) {
    return this.getUnadjustedBaseVerificationGas() + this.getGasOverheadForTxType(assetId, txType);
  }

  private getBaseFee(feeAssetId: number, txType: TxType, minPrice = false) {
    return this.toAssetPrice(feeAssetId, this.getAdjustedBaseVerificationGas(txType), minPrice);
  }

  private getEmptySlotFee(feeAssetId: number, minPrice = false) {
    return this.toAssetPrice(feeAssetId, this.getUnadjustedBaseVerificationGas(), minPrice);
  }

  private toAssetPrice(assetId: number, gas: number, minPrice: boolean) {
    const price = minPrice ? this.priceTracker.getMinAssetPrice(assetId) : this.priceTracker.getAssetPrice(assetId);
    const { decimals } = this.getAsset(assetId);
    if (!price) {
      return 0n;
    }
    const costOfGas = this.applyGasPrice(BigInt(gas) * 10n ** BigInt(decimals), minPrice) / price;
    return roundUp(costOfGas, this.numSignificantFigures);
  }

  private getFeeConstant(txAssetId: number, txType: TxType, feeAssetId: number, minPrice = false) {
    return this.toAssetPrice(feeAssetId, this.getGasOverheadForTxType(txAssetId, txType), minPrice);
  }

  private applyGasPrice(value: bigint, minPrice: boolean) {
    const gasPrice = minPrice ? this.priceTracker.getMinGasPrice() : this.priceTracker.getGasPrice();
    const multiplierPrecision = 10 ** 8;
    const feeGasPriceMultiplier = BigInt(this.feeGasPriceMultiplier * multiplierPrecision);
    const expectedValue = (value * gasPrice * feeGasPriceMultiplier) / BigInt(multiplierPrecision);
    const maxValue = this.maxFeeGasPrice ? value * this.maxFeeGasPrice : expectedValue;
    return expectedValue > maxValue ? maxValue : expectedValue;
  }

  private getGasOverheadForTxType(assetId: number, txType: TxType) {
    const gasPerByte = this.gasPerByte;
    switch (txType) {
      case TxType.ACCOUNT:
        return (OffchainAccountData.SIZE + this.getTxCallData(txType)) * gasPerByte;
      case TxType.DEFI_CLAIM:
        return (OffchainDefiClaimData.SIZE + this.getTxCallData(txType)) * gasPerByte;
      case TxType.DEFI_DEPOSIT:
        return (OffchainDefiDepositData.SIZE + this.getTxCallData(txType)) * gasPerByte;
      case TxType.DEPOSIT:
        // 3500 gas for ecrecover.
        return (OffchainJoinSplitData.SIZE + this.getTxCallData(txType)) * gasPerByte + 3500;
      case TxType.TRANSFER:
        return (OffchainJoinSplitData.SIZE + this.getTxCallData(txType)) * gasPerByte;
      case TxType.WITHDRAW_TO_CONTRACT:
      case TxType.WITHDRAW_TO_WALLET:
        return (
          // if the asset is not valid (i.e. it's virtual then quote the fee as if it was ETH)
          // this type of tx is not valid and would be trjected if it were attempted
          this.getAsset(this.isValidAsset(assetId) ? assetId : 0).gasLimit +
          (OffchainJoinSplitData.SIZE + this.getTxCallData(txType)) * gasPerByte
        );
    }
  }

  public getTxCallData(txType: TxType) {
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

  // retrieves the highest amount of calldata that any single tx can used based on it's type
  public getMaxTxCallData() {
    return allTxTypes.map(x => this.getTxCallData(x)).reduce((prev, currentValue) => Math.max(prev, currentValue), 0);
  }

  // retrieves the highest amount of real gas that can be used by any single tx
  // including all of the configured assets but does not include bridge gas
  public getMaxUnadjustedGas() {
    return this.getAssets()
      .flatMap((_, assetId) => allTxTypes.map(txType => ({ assetId, txType })))
      .reduce((prev, current) => Math.max(prev, this.getAdjustedTxGas(current.assetId, current.txType)), 0);
  }
}
