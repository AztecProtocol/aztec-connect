import { EthAddress } from '@aztec/barretenberg/address';
import { Blockchain, BlockchainAsset, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { BridgeResolver } from '../bridge';
import { FeeCalculator } from './fee_calculator';
import { PriceTracker } from './price_tracker';

export class TxFeeResolver {
  private allAssets!: BlockchainAsset[];
  private feePayingAssetIds!: number[];
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
    private feePayingAssetAddresses: string[],
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
    this.allAssets = assets;
    this.feePayingAssetIds = this.allAssets.flatMap((asset, id) =>
      this.feePayingAssetAddresses.some(feePayingAsset => asset.address.equals(EthAddress.fromString(feePayingAsset)))
        ? [id]
        : [],
    );
    const assetIds = this.feePayingAssetIds;
    this.priceTracker = new PriceTracker(this.blockchain, assetIds, this.refreshInterval, this.minFeeDuration);
    this.feeCalculator = new FeeCalculator(
      this.priceTracker,
      this.allAssets,
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
      return 0n;
    }
    return this.feeCalculator.getGasPaidForByFee(assetId, fee);
  }

  getBaseTxGas() {
    return BigInt(this.baseTxGas);
  }

  getTxGas(feeAssetId: number, txType: TxType) {
    return this.getBaseTxGas() + BigInt(this.allAssets[feeAssetId].gasConstants[txType]);
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
    const { inputAssetIdA: inputAssetId } = BridgeId.fromBigInt(bridgeId);
    const assetId = this.isFeePayingAsset(inputAssetId) ? inputAssetId : this.defaultFeePayingAsset;
    const singleBridgeTxGas = this.getSingleBridgeTxGas(bridgeId);
    const fullBridgeTxGas = this.getFullBridgeGas(bridgeId);
    const baseTxGas = BigInt(this.feeCalculator.getBaseTxGas());

    // both of these include the base tx gas
    const defiDepositGas = BigInt(this.feeCalculator.getTxGas(assetId, TxType.DEFI_DEPOSIT));
    const defiClaimGas = BigInt(this.feeCalculator.getTxGas(assetId, TxType.DEFI_CLAIM));
    const slowTxGas = defiDepositGas + defiClaimGas + singleBridgeTxGas;
    const fastTxGas = defiDepositGas + defiClaimGas + fullBridgeTxGas;
    const immediateTxGas = defiDepositGas + defiClaimGas + fullBridgeTxGas + baseTxGas * BigInt(this.txsPerRollup - 1);

    const values = [
      { assetId, value: this.feeCalculator.getTxFeeFromGas(slowTxGas, assetId) },
      { assetId, value: this.feeCalculator.getTxFeeFromGas(fastTxGas, assetId) },
      { assetId, value: this.feeCalculator.getTxFeeFromGas(immediateTxGas, assetId) },
    ];
    return values;
  }
}
