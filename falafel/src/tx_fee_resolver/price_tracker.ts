import { AssetId } from 'barretenberg/asset';
import { Blockchain, PriceFeed } from 'barretenberg/blockchain';

export class PriceTracker {
  private readonly gasPriceFeed: PriceFeed;
  private readonly assetPriceFeeds: PriceFeed[];
  private prices: { gasPrice: bigint; assetPrices: bigint[]; timestamp: number }[] = [];
  private running = false;
  private runningPromise!: Promise<void>;
  private readonly numHistoricalPrices: number;

  constructor(
    blockchain: Blockchain,
    assetIds: AssetId[],
    private readonly refreshInterval = 1000,
    recordDuration = refreshInterval,
  ) {
    this.gasPriceFeed = blockchain.getGasPriceFeed();
    this.assetPriceFeeds = assetIds.map(assetId => blockchain.getPriceFeed(assetId));
    this.numHistoricalPrices = Math.ceil(recordDuration / this.refreshInterval);
  }

  async start() {
    this.running = true;

    await this.recordPrices();

    this.runningPromise = (async () => {
      while (this.running) {
        await new Promise<void>(resolve =>
          setTimeout(async () => {
            try {
              await this.recordPrices();
            } catch (e) {
              console.log(e.message);
            }
            resolve();
          }, this.refreshInterval * +this.running),
        );
      }
    })();
  }

  async stop() {
    this.running = false;
    await this.runningPromise;
  }

  getGasPrice(msAgo = 0) {
    const startFrom = Date.now() - msAgo;
    return this.prices.find(({ timestamp }) => startFrom >= timestamp)?.gasPrice || 0n;
  }

  getAssetPrice(assetId: AssetId, msAgo = 0) {
    const startFrom = Date.now() - msAgo;
    return this.prices.find(({ timestamp }) => startFrom >= timestamp)?.assetPrices[assetId] || 0n;
  }

  getMinGasPrice() {
    return this.prices.reduce((min, { gasPrice }) => (gasPrice < min ? gasPrice : min), this.prices[0]?.gasPrice || 0n);
  }

  getMinAssetPrice(assetId: AssetId) {
    return this.prices.reduce(
      (min, { assetPrices }) => (assetPrices[assetId] < min ? assetPrices[assetId] : min),
      this.prices[0]?.assetPrices[assetId] || 0n,
    );
  }

  private async recordPrices() {
    const [gasPrice, ...assetPrices] = await Promise.all([
      this.gasPriceFeed.price(),
      ...this.assetPriceFeeds.map(priceFeed => priceFeed.price()),
    ]);
    this.prices = [{ gasPrice, assetPrices, timestamp: Date.now() }, ...this.prices.slice(0, this.numHistoricalPrices)];
  }
}
