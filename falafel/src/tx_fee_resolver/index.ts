import { AssetId } from '@aztec/barretenberg/asset';
import { Blockchain, BlockchainAsset, TxType } from '@aztec/barretenberg/blockchain';
import { AssetFeeQuote } from '@aztec/barretenberg/rollup_provider';
import { TxDao } from '../entity/tx';
import { RollupDb } from '../rollup_db';
import { FeeCalculator } from './fee_calculator';
import { PriceTracker } from './price_tracker';

export class TxFeeResolver {
  private assets!: BlockchainAsset[];
  private priceTracker!: PriceTracker;
  private feeCalculator!: FeeCalculator;

  constructor(
    private blockchain: Blockchain,
    private rollupDb: RollupDb,
    private baseTxGas: number,
    private maxFeeGasPrice: bigint,
    private feeGasPriceMultiplier: number,
    private txsPerRollup: number,
    private publishInterval: number,
    private surplusRatios = [1, 0.9, 0.5, 0],
    private feeFreeAssets: AssetId[] = [],
  ) {}

  async start() {
    const { assets } = await this.blockchain.getBlockchainStatus();
    this.assets = assets;
    const assetIds = assets.map((_, id) => id);
    this.priceTracker = new PriceTracker(this.blockchain, this.rollupDb, assetIds);
    this.feeCalculator = new FeeCalculator(
      this.priceTracker,
      this.assets,
      this.baseTxGas,
      this.maxFeeGasPrice,
      this.feeGasPriceMultiplier,
      this.txsPerRollup,
      this.publishInterval,
      this.surplusRatios,
      this.feeFreeAssets,
    );
    await this.priceTracker.start();
  }

  async stop() {
    await this.priceTracker?.stop();
  }

  getMinTxFee(assetId: number, txType: TxType) {
    if (!this.feeCalculator) {
      return 0n;
    }
    return this.feeCalculator.getMinTxFee(assetId, txType);
  }

  getFeeQuotes(assetId: number): AssetFeeQuote {
    if (!this.feeCalculator) {
      return { feeConstants: [], baseFeeQuotes: [] };
    }
    return this.feeCalculator.getFeeQuotes(assetId);
  }

  computeSurplusRatio(txs: TxDao[]) {
    if (!this.feeCalculator) {
      return 1;
    }
    return this.feeCalculator.computeSurplusRatio(txs);
  }
}
