import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { BridgeResolver } from '../bridge';
import { FeeCalculator } from './fee_calculator';
import { getTxCallData } from './get_gas_overhead';
import { PriceTracker } from './price_tracker';

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

  getAdjustedBridgeTxGas(txAssetId: number, bridgeId: bigint) {
    return this.getAdjustedTxGas(txAssetId, TxType.DEFI_DEPOSIT) + this.getSingleBridgeTxGas(bridgeId);
  }

  getUnadjustedBridgeTxGas(txAssetId: number, bridgeId: bigint) {
    return this.getUnadjustedTxGas(txAssetId, TxType.DEFI_DEPOSIT) + this.getSingleBridgeTxGas(bridgeId);
  }

  getSingleBridgeTxGas(bridgeId: bigint) {
    return this.bridgeResolver.getMinBridgeTxGas(bridgeId);
  }

  getFullBridgeGas(bridgeId: bigint) {
    return this.bridgeResolver.getFullBridgeGas(bridgeId);
  }

  getFullBridgeGasFromContract(bridgeId: bigint) {
    return this.bridgeResolver.getFullBridgeGasFromContract(bridgeId);
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

  getDefiFees(bridgeId: bigint) {
    const { inputAssetIdA: inputAssetId } = BridgeId.fromBigInt(bridgeId);
    const feeAssetId = this.isFeePayingAsset(inputAssetId) ? inputAssetId : this.defaultFeePayingAsset;
    const singleBridgeTxGas = this.getSingleBridgeTxGas(bridgeId);
    const fullBridgeTxGas = this.getFullBridgeGas(bridgeId);
    const emptySlotGas = this.getUnadjustedBaseVerificationGas();

    // both of these include the base tx gas
    const defiDepositGas = this.getAdjustedTxGas(inputAssetId, TxType.DEFI_DEPOSIT);
    const defiClaimGas = this.getAdjustedTxGas(inputAssetId, TxType.DEFI_CLAIM);
    const slowTxGas = defiDepositGas + defiClaimGas + singleBridgeTxGas;
    const fastTxGas = defiDepositGas + defiClaimGas + fullBridgeTxGas;
    const immediateTxGas = defiDepositGas + defiClaimGas + fullBridgeTxGas + emptySlotGas * (this.txsPerRollup - 1);

    const values = [
      { assetId: feeAssetId, value: this.feeCalculator.getTxFeeFromGas(feeAssetId, slowTxGas) },
      { assetId: feeAssetId, value: this.feeCalculator.getTxFeeFromGas(feeAssetId, fastTxGas) },
      { assetId: feeAssetId, value: this.feeCalculator.getTxFeeFromGas(feeAssetId, immediateTxGas) },
    ];
    return values;
  }

  getTxFeeFromGas(feeAssetId: number, gas: number) {
    return this.feeCalculator.getTxFeeFromGas(feeAssetId, gas);
  }
}
