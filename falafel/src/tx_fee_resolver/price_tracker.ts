import { AssetId } from 'barretenberg/asset';
import { Blockchain, PriceFeed } from 'barretenberg/blockchain';

export class PriceTracker {
  private gasPriceFeed: PriceFeed;
  private assetPriceFeeds: PriceFeed[];
  private gasPrice = 0n;
  private assetPrices: bigint[] = [];
  private running = false;
  private runningPromise!: Promise<void>;

  constructor(
    blockchain: Blockchain,
    assetIds: AssetId[],
    private readonly refreshInterval = 5 * 60 * 1000, // 5 mins
  ) {
    this.gasPriceFeed = blockchain.getGasPriceFeed();
    this.assetPriceFeeds = assetIds.map(assetId => blockchain.getPriceFeed(assetId));
  }

  async start() {
    this.running = true;

    await this.recordRollupPrices();

    this.runningPromise = (async () => {
      while (this.running) {
        await this.recordRollupPrices();
        await new Promise(resolve => setTimeout(resolve, this.refreshInterval * +this.running));
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

  private async recordRollupPrices() {
    const [gasPrice, ...assetPrices] = await Promise.all([
      this.gasPriceFeed.price(),
      ...this.assetPriceFeeds.map(priceFeed => priceFeed.price()),
    ]);
    this.gasPrice = gasPrice;
    this.assetPrices = assetPrices;
  }
}
