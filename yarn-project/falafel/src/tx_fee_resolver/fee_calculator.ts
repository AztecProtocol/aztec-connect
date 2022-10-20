import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { createLogger } from '@aztec/barretenberg/log';
import { getGasOverhead, getTxCallData } from './get_gas_overhead.js';
import { PriceTracker } from './price_tracker.js';
import { roundUp } from './round_up.js';

const allTxTypes = [
  TxType.DEPOSIT,
  TxType.TRANSFER,
  TxType.WITHDRAW_TO_WALLET,
  TxType.WITHDRAW_HIGH_GAS,
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
    private readonly gasPerRollup: number,
    private readonly numSignificantFigures = 0,
    private readonly log = createLogger('FeeCalculator'),
  ) {
    this.log('Creating...');
    const txTypes = Object.values(TxType).filter(v => !isNaN(Number(v)));
    const firstTwoAssets = this.getAssets().slice(0, 2);
    for (let assetId = 0; assetId < firstTwoAssets.length; assetId++) {
      const asset = firstTwoAssets[assetId];
      for (let i = 0; i < txTypes.length; i++) {
        const callData = getTxCallData(i);
        const adjBase = this.getAdjustedBaseVerificationGas(assetId, i);
        const unadjBase = this.getUnadjustedBaseVerificationGas();
        const gasOverhead = this.getGasOverheadForTxType(assetId, i);
        const maxAdjTxs = this.getMaxAdjustedTxsPerRollup(assetId, i);
        const numAdjTxs = this.getNumAdjustedTxsPerRollup(assetId, i);
        this.log(
          `  ${TxType[i]} for ${
            asset.symbol ?? 'N/A'
          } call data: ${callData}, adj/base gas: ${adjBase}/${unadjBase}, ` +
            `tx gas: ${gasOverhead}, max/quoted txs per rollup: ${maxAdjTxs}/${numAdjTxs}`,
        );
      }
      this.log(`  -----------------------------------------------------------------------------`);
    }
  }

  public getTxFees(txAssetId: number, feeAssetId: number) {
    return allTxTypes.map(txType => [
      {
        assetId: feeAssetId,
        value: this.getBaseFee(txAssetId, feeAssetId, txType) + this.getFeeConstant(txAssetId, feeAssetId, txType),
      },
      {
        assetId: feeAssetId,
        value:
          this.getEmptySlotFee(feeAssetId) * BigInt(this.txsPerRollup) +
          this.getFeeConstant(txAssetId, feeAssetId, txType),
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

  public getTxFeeFromGas(feeAssetId: number, gas: number) {
    return this.toAssetPrice(feeAssetId, gas, false);
  }

  public getGasPaidForByFee(feeAssetId: number, fee: bigint) {
    const assetCostInWei = this.priceTracker.getAssetPrice(feeAssetId);
    // Our feeGasPriceMultiplier can be accurate to 8 decimal places (e.g. 0.00000001).
    const multiplierPrecision = 10 ** 8;
    const feeGasPriceMultiplier = BigInt(this.feeGasPriceMultiplier * multiplierPrecision);
    const gasPriceInWei = (this.priceTracker.getMinGasPrice() * feeGasPriceMultiplier) / BigInt(multiplierPrecision);
    const { decimals } = this.getAsset(feeAssetId);
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
  public getAdjustedBaseVerificationGas(txAssetId: number, txType: TxType) {
    return this.getUnadjustedBaseVerificationGas() + this.getTxGasAdjustmentValue(txAssetId, txType);
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
  public getTxGasAdjustmentValue(txAssetId: number, txType: TxType) {
    const unadjusted = this.verificationGas / this.txsPerRollup;
    const numAdjustedTxs = this.getNumAdjustedTxsPerRollup(txAssetId, txType);
    const adjusted = this.verificationGas / numAdjustedTxs;
    const difference = adjusted - unadjusted;
    return Math.ceil(difference);
  }

  // this calculates the number of txs of the given type that can fit into a rollup
  // it is essentially the minimum of the following
  // 1. the maximum number of slots in the rollup
  // 2. the maximum number of txs of that type that can fit into the available ethereum tx calldata
  // 3. the maximum number of txs of that type that can fit into the available rollup gas limit
  // note the subtraction of max calldata and max gas when working out items 2 and 3.
  // this is because we will inevitably need to publish rollups that are not quite 'full' of calldata/gas
  // as soon as there is not enough calldata/gas available for all of our tx types then we need to publish
  // otherwise we could encounter a situation where a user pays for an instant tx that won't fit
  // by removing this worst case value from the amount available to txs we should prevent
  // this situation occuring
  private getNumAdjustedTxsPerRollup(txAssetId: number, txType: TxType) {
    const callDataForTx = getTxCallData(txType);
    const maxCallDataForAnyTx = this.getMaxTxCallData();
    const callDataAvailableForTxs = this.callDataPerRollup - maxCallDataForAnyTx;
    const numTxsAccountingForCallData = Math.floor(callDataAvailableForTxs / callDataForTx);
    const gasForTx = this.getGasOverheadForTxType(txAssetId, txType);
    const maxGasForAnyTx = this.getMaxUnadjustedGas();
    const gasAvailableForTxs = this.gasPerRollup - (this.verificationGas + maxGasForAnyTx);
    const numTxsAccountingForGas = Math.floor(gasAvailableForTxs / gasForTx);
    return Math.min(numTxsAccountingForCallData, numTxsAccountingForGas, this.txsPerRollup);
  }

  // this calculates the same as above but does not reduce the available gas/calldata
  // this should not be used to compute the fee quoted to users as it could result in unprofitable rollups.
  // effectively this is the max number of txs that will ideally fit into a rollup
  private getMaxAdjustedTxsPerRollup(txAssetId: number, txType: TxType) {
    const callDataForTx = getTxCallData(txType);
    const numTxsAccountingForCallData = Math.floor(this.callDataPerRollup / callDataForTx);
    const gasForTx = this.getGasOverheadForTxType(txAssetId, txType);
    const gasAvailableForTxs = this.gasPerRollup - this.verificationGas;
    const numTxsAccountingForGas = Math.floor(gasAvailableForTxs / gasForTx);
    return Math.min(numTxsAccountingForCallData, numTxsAccountingForGas, this.txsPerRollup);
  }

  // the full gas cost of the tx, including the base gas adjustment
  public getAdjustedTxGas(txAssetId: number, txType: TxType) {
    return this.getAdjustedBaseVerificationGas(txAssetId, txType) + this.getGasOverheadForTxType(txAssetId, txType);
  }

  // the full gas cost of the tx, excluding the base gas adjustment
  public getUnadjustedTxGas(txAssetId: number, txType: TxType) {
    return this.getUnadjustedBaseVerificationGas() + this.getGasOverheadForTxType(txAssetId, txType);
  }

  private getBaseFee(txAssetId: number, feeAssetId: number, txType: TxType, minPrice = false) {
    return this.toAssetPrice(feeAssetId, this.getAdjustedBaseVerificationGas(txAssetId, txType), minPrice);
  }

  private getEmptySlotFee(feeAssetId: number, minPrice = false) {
    return this.toAssetPrice(feeAssetId, this.getUnadjustedBaseVerificationGas(), minPrice);
  }

  private toAssetPrice(feeAssetId: number, gas: number, minPrice: boolean) {
    const price = minPrice
      ? this.priceTracker.getMinAssetPrice(feeAssetId)
      : this.priceTracker.getAssetPrice(feeAssetId);
    const { decimals } = this.getAsset(feeAssetId);
    if (!price) {
      return 0n;
    }
    const costOfGas = this.applyGasPrice(BigInt(gas) * 10n ** BigInt(decimals), minPrice) / price;
    return roundUp(costOfGas, this.numSignificantFigures);
  }

  private getFeeConstant(txAssetId: number, feeAssetId: number, txType: TxType, minPrice = false) {
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

  private getGasOverheadForTxType(txAssetId: number, txType: TxType) {
    // if the asset is not valid (i.e. it's virtual then quote the fee as if it was ETH),
    // this type of tx is not valid and would be rejected if it were attempted
    const gasAssetId = this.isValidAsset(txAssetId) ? txAssetId : 0;
    const asset = this.getAsset(gasAssetId);
    const assetGasLimit = { assetId: gasAssetId, gasLimit: asset.gasLimit };
    return getGasOverhead(txType, assetGasLimit);
  }

  // retrieves the highest amount of calldata that any single tx can used based on it's type
  public getMaxTxCallData() {
    return allTxTypes.map(x => getTxCallData(x)).reduce((prev, currentValue) => Math.max(prev, currentValue), 0);
  }

  // retrieves the highest amount of real gas that can be used by any single tx
  // including all of the configured assets but does not include bridge gas
  public getMaxUnadjustedGas() {
    return this.getAssets()
      .flatMap((_, assetId) => allTxTypes.map(txType => ({ assetId, txType })))
      .reduce((prev, current) => Math.max(prev, this.getUnadjustedTxGas(current.assetId, current.txType)), 0);
  }
}
