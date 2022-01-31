import { Blockchain, BlockchainAsset, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxSettlementTime } from '@aztec/barretenberg/rollup_provider';
import { BridgeResolver } from '../bridge';
import { FeeCalculator } from './fee_calculator';
import { PriceTracker } from './price_tracker';

export class TxFeeResolver {
  private assets!: BlockchainAsset[];
  private priceTracker!: PriceTracker;
  private feeCalculator!: FeeCalculator;

  private readonly defaultFeePayingAsset = 0;

  constructor(
    private readonly blockchain: Blockchain,
    private readonly bridgeResolver: BridgeResolver,
    private baseTxGas: number,
    private maxFeeGasPrice: bigint,
    private feeGasPriceMultiplier: number,
    private readonly txsPerRollup: number,
    private publishInterval: number,
    private readonly surplusRatios = [1, 0],
    private readonly freeAssets: number[] = [],
    private readonly freeTxTypes: TxType[] = [],
    private readonly numSignificantFigures = 2,
    private readonly refreshInterval = 5 * 60 * 1000, // 5 mins
    private readonly minFeeDuration = refreshInterval * 2, // 10 mins
  ) {}

  public setConf(baseTxGas: number, maxFeeGasPrice: bigint, feeGasPriceMultiplier: number, publishInterval: number) {
    this.baseTxGas = baseTxGas;
    this.maxFeeGasPrice = maxFeeGasPrice;
    this.feeGasPriceMultiplier = feeGasPriceMultiplier;
    this.publishInterval = publishInterval;
  }

  async start() {
    const { assets } = await this.blockchain.getBlockchainStatus();
    this.assets = assets;
    const assetIds = assets.map((_, id) => id);
    this.priceTracker = new PriceTracker(this.blockchain, assetIds, this.refreshInterval, this.minFeeDuration);
    this.feeCalculator = new FeeCalculator(
      this.priceTracker,
      this.assets,
      this.baseTxGas,
      this.maxFeeGasPrice,
      this.feeGasPriceMultiplier,
      this.txsPerRollup,
      this.publishInterval,
      this.surplusRatios,
      this.freeAssets,
      this.freeTxTypes,
      this.numSignificantFigures,
    );
    await this.priceTracker.start();
  }

  async stop() {
    await this.priceTracker?.stop();
  }

  isFeePayingAsset(assetId: number) {
    return assetId <= this.assets.length;
  }

  getMinTxFee(assetId: number, txType: TxType) {
    if (!this.feeCalculator) {
      return 0n;
    }
    return this.feeCalculator.getMinTxFee(assetId, txType);
  }

  getGasPaidForByFee(assetId: number, fee: bigint) {
    if (!this.feeCalculator) {
      return 0n;
    }
    return this.feeCalculator.getGasPaidForByFee(assetId, fee);
  }

  getBaseTxGas() {
    return BigInt(this.baseTxGas);
  }

  getTxGas(feeAssetId: number, txType: TxType) {
    return this.getBaseTxGas() + BigInt(this.assets[feeAssetId].gasConstants[txType]);
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
    const { feeConstants, baseFeeQuotes } = this.feeCalculator.getFeeQuotes(feePayingAsset);
    return feeConstants.map(fee =>
      baseFeeQuotes.map(feeQuote => ({ assetId: feePayingAsset, value: fee + feeQuote.fee })),
    );
  }

  getDefiFees(bridgeId: bigint) {
    const { inputAssetId } = BridgeId.fromBigInt(bridgeId);
    const assetId = this.isFeePayingAsset(inputAssetId) ? inputAssetId : this.defaultFeePayingAsset;
    const gas = this.getSingleBridgeTxGas(bridgeId);
    const fullGas = this.getFullBridgeGas(bridgeId);
    const bridgeFee = this.feeCalculator.getTxFeeFromGas(gas, assetId);
    const fullBridgeFee = this.feeCalculator.getTxFeeFromGas(fullGas, assetId);
    const { feeConstants, baseFeeQuotes } = this.feeCalculator.getFeeQuotes(assetId);
    const defiDepositFee = feeConstants[TxType.DEFI_DEPOSIT];
    const claimFee = feeConstants[TxType.DEFI_CLAIM];
    const txRollupFee = baseFeeQuotes[TxSettlementTime.NEXT_ROLLUP].fee;
    const fullRollupFee = baseFeeQuotes[TxSettlementTime.INSTANT].fee;
    return [
      { assetId, value: bridgeFee + defiDepositFee + claimFee + txRollupFee * 3n },
      { assetId, value: fullBridgeFee + defiDepositFee + claimFee + txRollupFee * 3n },
      { assetId, value: fullBridgeFee + defiDepositFee + claimFee + fullRollupFee },
    ];
  }
}
