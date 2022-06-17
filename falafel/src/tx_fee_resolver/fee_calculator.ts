import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { createLogger } from '@aztec/barretenberg/log';
import { getGasOverhead, getTxCallData } from './get_gas_overhead';
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
    private readonly log = createLogger('FeeCalculator'),
  ) {
    this.log('Creating...');
    const txTypes = Object.values(TxType).filter(v => !isNaN(Number(v)));
    for (let i = 0; i < txTypes.length; i++) {
      const callData = getTxCallData(i);
      const adjBase = this.getAdjustedBaseVerificationGas(i);
      const unadjBase = this.getUnadjustedBaseVerificationGas();
      const gasOverhead = this.getGasOverheadForTxType(0, i);
      const maxAdjTxs = this.getMaxAdjustedTxsPerRollup(i);
      const numAdjTxs = this.getNumAdjustedTxsPerRollup(i);
      this.log(
        `  ${TxType[i]} call data: ${callData}, adj/base gas: ${adjBase}/${unadjBase}, ` +
          `ETH tx gas: ${gasOverhead}, max/quoted txs per rollup: ${maxAdjTxs}/${numAdjTxs}`,
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
  // subtracting 1 from the ideal total number of txs should ensure that where we need to publish a rollup
  // limited by calldata, it will always be profitable
  private getNumAdjustedTxsPerRollup(txType: TxType) {
    const callDataForTx = getTxCallData(txType);
    const numTxsAccountingForCallData = Math.floor(this.callDataPerRollup / callDataForTx) - 1;
    return Math.min(numTxsAccountingForCallData, this.txsPerRollup);
  }

  // this calculates the same as above but does not reduce the number by 1 for tx types that have call data restrictions
  // this should not be used to compute the fee quoted to users as it could result in unprofitable rollups.
  // effectively this is the max number of txs that will ideally fit into a rollup
  private getMaxAdjustedTxsPerRollup(txType: TxType) {
    const callDataForTx = getTxCallData(txType);
    const numTxsAccountingForCallData = Math.floor(this.callDataPerRollup / callDataForTx);
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
    // if the asset is not valid (i.e. it's virtual then quote the fee as if it was ETH),
    // this type of tx is not valid and would be rejected if it were attempted
    return getGasOverhead(txType, this.getAsset(this.isValidAsset(assetId) ? assetId : 0).gasLimit);
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
      .reduce((prev, current) => Math.max(prev, this.getAdjustedTxGas(current.assetId, current.txType)), 0);
  }
}
