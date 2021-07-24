import { AssetId } from '@aztec/barretenberg/asset';
import { Blockchain, PriceFeed } from '@aztec/barretenberg/blockchain';
import { RollupDb } from '../rollup_db';

export class PriceTracker {
  private gasPriceFeed: PriceFeed;
  private assetPriceFeeds: PriceFeed[];
  private nextRollupId = 0;
  private gasPrice = 0n;
  private assetPrices: bigint[] = [];
  private running = false;
  private runningPromise!: Promise<void>;

  constructor(blockchain: Blockchain, private rollupDb: RollupDb, assetIds: AssetId[]) {
    this.gasPriceFeed = blockchain.getGasPriceFeed();
    this.assetPriceFeeds = assetIds.map(assetId => blockchain.getPriceFeed(assetId));
  }

  async start() {
    this.running = true;

    await this.restorePrices();

    this.runningPromise = (async () => {
      while (this.running) {
        await this.recordRollupPrices();
        await new Promise(resolve => setTimeout(resolve, 1000 * +this.running));
      }
    })();
  }

  async stop() {
    this.running = false;
    await this.runningPromise;
  }

  getGasPrice() {
    return this.gasPrice;
  }

  getAssetPrice(assetId: AssetId) {
    return this.assetPrices[assetId] || 0n;
  }

  private async restorePrices() {
    const [lastRollup] = await this.rollupDb.getRollups(1, 0, true);
    const timestamp = Math.floor((lastRollup ? lastRollup.created.getTime() : Date.now()) / 1000);
    const [gasPrice, ...assetPrices] = await Promise.all(
      [this.gasPriceFeed, ...this.assetPriceFeeds].map(priceFeed => this.findHistoricalPrice(priceFeed, timestamp)),
    );
    this.gasPrice = gasPrice;
    this.assetPrices = assetPrices;
    this.nextRollupId = lastRollup ? lastRollup.id + 1 : 0;
  }

  private async recordRollupPrices() {
    const [lastRollup] = await this.rollupDb.getRollups(1, 0, true);
    const nextRollupId = lastRollup ? lastRollup.id + 1 : 0;
    if (nextRollupId !== this.nextRollupId) {
      const [gasPrice, ...assetPrices] = await Promise.all([
        this.gasPriceFeed.price(),
        ...this.assetPriceFeeds.map(priceFeed => priceFeed.price()),
      ]);
      this.gasPrice = gasPrice;
      this.assetPrices = assetPrices;
      this.nextRollupId = nextRollupId;
    }
  }

  private async findHistoricalPrice(priceFeed: PriceFeed, timestamp: number) {
    let data = await priceFeed.getRoundData(await priceFeed.latestRound());
    let prevPrice = 0n;
    while (data.timestamp > timestamp && data.roundId > 0) {
      prevPrice = data.price;
      data = await priceFeed.getRoundData(data.roundId - 1n);
    }
    return data.price || prevPrice;
  }
}
