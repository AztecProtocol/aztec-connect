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
    numSignificantFigures = 2,
    refreshInterval = 5 * 60 * 1000, // 5 mins
    minFeeDuration = refreshInterval * 2, // 10 mins
  ) {
    const { assets } = blockchain.getBlockchainStatus();
    this.priceTracker = new PriceTracker(blockchain, feePayingAssetIds, refreshInterval, minFeeDuration);
    this.feeCalculator = new FeeCalculator(
      this.priceTracker,
      assets,
      verificationGas,
      maxFeeGasPrice,
      feeGasPriceMultiplier,
      txsPerRollup,
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

  getMinTxFee(assetId: number, txType: TxType) {
    if (!this.feeCalculator) {
      return 0n;
    }
    return this.feeCalculator.getMinTxFee(assetId, txType);
  }

  getGasPaidForByFee(assetId: number, fee: bigint) {
    if (!this.feeCalculator) {
      return 0;
    }
    return this.feeCalculator.getGasPaidForByFee(assetId, fee);
  }

  getBaseTxGas() {
    return this.feeCalculator.getBaseTxGas();
  }

  getTxGas(feeAssetId: number, txType: TxType) {
    return this.feeCalculator.getTxGas(feeAssetId, txType);
  }

  getBridgeTxGas(feeAssetId: number, bridgeId: bigint) {
    return this.getTxGas(feeAssetId, TxType.DEFI_DEPOSIT) + this.getSingleBridgeTxGas(bridgeId);
  }

  getSingleBridgeTxGas(bridgeId: bigint) {
    return this.bridgeResolver.getMinBridgeTxGas(bridgeId);
  }

  getFullBridgeGas(bridgeId: bigint) {
    return this.bridgeResolver.getFullBridgeGas(bridgeId);
  }

  getTxFees(assetId: number) {
    const feePayingAsset = this.isFeePayingAsset(assetId) ? assetId : this.defaultFeePayingAsset;
    return this.feeCalculator.getTxFees(feePayingAsset);
  }

  getDefiFees(bridgeId: bigint) {
    const { inputAssetIdA: inputAssetId } = BridgeId.fromBigInt(bridgeId);
    const assetId = this.isFeePayingAsset(inputAssetId) ? inputAssetId : this.defaultFeePayingAsset;
    const singleBridgeTxGas = this.getSingleBridgeTxGas(bridgeId);
    const fullBridgeTxGas = this.getFullBridgeGas(bridgeId);
    const baseTxGas = this.feeCalculator.getBaseTxGas();

    // both of these include the base tx gas
    const defiDepositGas = this.feeCalculator.getTxGas(assetId, TxType.DEFI_DEPOSIT);
    const defiClaimGas = this.feeCalculator.getTxGas(assetId, TxType.DEFI_CLAIM);
    const slowTxGas = defiDepositGas + defiClaimGas + singleBridgeTxGas;
    const fastTxGas = defiDepositGas + defiClaimGas + fullBridgeTxGas;
    const immediateTxGas = defiDepositGas + defiClaimGas + fullBridgeTxGas + baseTxGas * (this.txsPerRollup - 1);

    const values = [
      { assetId, value: this.feeCalculator.getTxFeeFromGas(slowTxGas, assetId) },
      { assetId, value: this.feeCalculator.getTxFeeFromGas(fastTxGas, assetId) },
      { assetId, value: this.feeCalculator.getTxFeeFromGas(immediateTxGas, assetId) },
    ];
    return values;
  }
}
