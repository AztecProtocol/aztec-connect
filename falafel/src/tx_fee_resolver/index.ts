import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { BridgeResolver } from '../bridge';
import { FeeCalculator } from './fee_calculator';
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

  getMinTxFee(txAssetId: number, txType: TxType, feeAssetId: number) {
    return this.feeCalculator.getMinTxFee(txAssetId, txType, feeAssetId);
  }

  getGasPaidForByFee(assetId: number, fee: bigint) {
    return this.feeCalculator.getGasPaidForByFee(assetId, fee);
  }

  getAdjustedBaseVerificationGas(txType: TxType) {
    return this.feeCalculator.getAdjustedBaseVerificationGas(txType);
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

  getTxFees(assetId: number) {
    const feePayingAsset = this.isFeePayingAsset(assetId) ? assetId : this.defaultFeePayingAsset;
    return this.feeCalculator.getTxFees(assetId, feePayingAsset);
  }

  getTxCallData(txType: TxType) {
    return this.feeCalculator.getTxCallData(txType);
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
      { assetId: feeAssetId, value: this.feeCalculator.getTxFeeFromGas(slowTxGas, feeAssetId) },
      { assetId: feeAssetId, value: this.feeCalculator.getTxFeeFromGas(fastTxGas, feeAssetId) },
      { assetId: feeAssetId, value: this.feeCalculator.getTxFeeFromGas(immediateTxGas, feeAssetId) },
    ];
    return values;
  }
}
