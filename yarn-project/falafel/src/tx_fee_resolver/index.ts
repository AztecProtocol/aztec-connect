import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { BridgeResolver } from '../bridge/index.js';
import { FeeCalculator } from './fee_calculator.js';
import { getTxCallData } from './get_gas_overhead.js';
import { PriceTracker } from './price_tracker.js';

export class TxFeeResolver {
  private priceTracker!: PriceTracker;
  private feeCalculator!: FeeCalculator;
  private readonly defaultFeePayingAsset = 0;

  constructor(
    blockchain: Blockchain,
    private readonly bridgeResolver: BridgeResolver,
    verificationGas: number,
    maxFeeGasPrice: bigint,
    feeGasPriceMultiplier: number,
    private readonly txsPerRollup: number,
    private readonly feePayingAssetIds: number[],
    callDataPerRollup: number,
    gasLimitPerRollup: number,
    numSignificantFigures = 2,
    private exitOnly = false,
    refreshInterval = 5 * 60 * 1000, // 5 mins
    minFeeDuration = refreshInterval * 2, // 10 mins
  ) {
    this.priceTracker = new PriceTracker(blockchain, feePayingAssetIds, refreshInterval, minFeeDuration);
    this.feeCalculator = new FeeCalculator(
      this.priceTracker,
      blockchain,
      verificationGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      txsPerRollup,
      callDataPerRollup,
      gasLimitPerRollup,
      numSignificantFigures,
      this.exitOnly,
    );
  }

  async start() {
    await this.priceTracker.start();
  }

  async stop() {
    await this.priceTracker?.stop();
  }

  isFeePayingAsset(assetId: number) {
    return this.feePayingAssetIds.some(id => id === assetId);
  }

  getGasPaidForByFee(assetId: number, fee: bigint) {
    return this.feeCalculator.getGasPaidForByFee(assetId, fee);
  }

  getAdjustedBaseVerificationGas(txAssetId: number, txType: TxType) {
    return this.feeCalculator.getAdjustedBaseVerificationGas(txAssetId, txType);
  }

  getUnadjustedBaseVerificationGas() {
    return this.feeCalculator.getUnadjustedBaseVerificationGas();
  }

  getAdjustedTxGas(txAssetId: number, txType: TxType) {
    return this.feeCalculator.getAdjustedTxGas(txAssetId, txType);
  }

  getUnadjustedTxGas(txAssetId: number, txType: TxType) {
    return this.feeCalculator.getUnadjustedTxGas(txAssetId, txType);
  }

  getAdjustedBridgeTxGas(txAssetId: number, bridgeCallData: bigint) {
    return this.getAdjustedTxGas(txAssetId, TxType.DEFI_DEPOSIT) + this.getSingleBridgeTxGas(bridgeCallData);
  }

  getUnadjustedBridgeTxGas(txAssetId: number, bridgeCallData: bigint) {
    return this.getUnadjustedTxGas(txAssetId, TxType.DEFI_DEPOSIT) + this.getSingleBridgeTxGas(bridgeCallData);
  }

  getSingleBridgeTxGas(bridgeCallData: bigint) {
    return this.bridgeResolver.getMinBridgeTxGas(bridgeCallData);
  }

  getFullBridgeGas(bridgeCallData: bigint) {
    return this.bridgeResolver.getFullBridgeGas(bridgeCallData);
  }

  getFullBridgeGasFromContract(bridgeCallData: bigint) {
    return this.bridgeResolver.getFullBridgeGasFromContract(bridgeCallData);
  }

  getTxFees(txAssetId: number) {
    const feePayingAsset = this.isFeePayingAsset(txAssetId) ? txAssetId : this.defaultFeePayingAsset;
    return this.feeCalculator.getTxFees(txAssetId, feePayingAsset);
  }

  getTxCallData(txType: TxType) {
    return getTxCallData(txType);
  }

  getMaxTxCallData() {
    return this.feeCalculator.getMaxTxCallData();
  }

  getMaxUnadjustedGas() {
    return this.feeCalculator.getMaxUnadjustedGas();
  }

  getDefiFees(bridgeCallData: bigint) {
    const { inputAssetIdA: inputAssetId } = BridgeCallData.fromBigInt(bridgeCallData);
    const feeAssetId = this.isFeePayingAsset(inputAssetId) ? inputAssetId : this.defaultFeePayingAsset;
    const singleBridgeTxGas = this.getSingleBridgeTxGas(bridgeCallData);
    const fullBridgeTxGas = this.getFullBridgeGas(bridgeCallData);
    const emptySlotGas = this.getUnadjustedBaseVerificationGas();

    // both of these include the base tx gas
    const defiDepositGas = this.getAdjustedTxGas(inputAssetId, TxType.DEFI_DEPOSIT);
    const defiClaimGas = this.getAdjustedTxGas(inputAssetId, TxType.DEFI_CLAIM);
    const slowTxGas = defiDepositGas + defiClaimGas + singleBridgeTxGas;
    const fastTxGas = defiDepositGas + defiClaimGas + fullBridgeTxGas;
    const immediateTxGas = defiDepositGas + defiClaimGas + fullBridgeTxGas + emptySlotGas * (this.txsPerRollup - 1);

    const values = [
      // AC SUNSET CODE
      this.exitOnly
        ? { assetId: feeAssetId, value: 0n }
        : { assetId: feeAssetId, value: this.feeCalculator.getTxFeeFromGas(feeAssetId, slowTxGas) },
      { assetId: feeAssetId, value: this.feeCalculator.getTxFeeFromGas(feeAssetId, fastTxGas) },
      { assetId: feeAssetId, value: this.feeCalculator.getTxFeeFromGas(feeAssetId, immediateTxGas) },
    ];
    return values;
  }

  getTxFeeFromGas(feeAssetId: number, gas: number) {
    return this.feeCalculator.getTxFeeFromGas(feeAssetId, gas);
  }
}
