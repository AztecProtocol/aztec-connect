import { Blockchain, PriceFeed } from '@aztec/barretenberg/blockchain';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';

export class PriceTracker {
  private readonly gasPriceFeed: PriceFeed;
  private assetPriceFeeds: { [assetId: number]: PriceFeed };
  private prices: { gasPrice: bigint; assetPrices: { [assetId: number]: bigint }; timestamp: number }[] = [];
  private running = false;
  private runningPromise!: Promise<void>;
  private readonly numHistoricalPrices: number;
  private interruptableSleep = new InterruptableSleep();

  constructor(
    blockchain: Blockchain,
    private assetIds: number[],
    private readonly refreshInterval = 1000,
    recordDuration = refreshInterval,
  ) {
    this.gasPriceFeed = blockchain.getGasPriceFeed();
    this.assetPriceFeeds = {};
    assetIds.forEach(assetId => {
      this.assetPriceFeeds[assetId] = blockchain.getPriceFeed(assetId);
    });
    this.numHistoricalPrices = Math.ceil(recordDuration / this.refreshInterval);
  }

  async start() {
    this.running = true;

    await this.recordPrices();

    this.runningPromise = (async () => {
      while (this.running) {
        await this.interruptableSleep.sleep(this.refreshInterval);
        if (!this.running) {
          return;
        }
        try {
          await this.recordPrices();
        } catch (e: any) {
          console.log(e.message);
        }
      }
    })();
  }

  async stop() {
    this.running = false;
    this.interruptableSleep.interrupt();
    await this.runningPromise;
  }

  getGasPrice(msAgo = 0) {
    const startFrom = Date.now() - msAgo;
    return this.prices.find(({ timestamp }) => startFrom >= timestamp)?.gasPrice || 0n;
  }

  getAssetPrice(assetId: number, msAgo = 0) {
    const startFrom = Date.now() - msAgo;
    return this.prices.find(({ timestamp }) => startFrom >= timestamp)?.assetPrices[assetId] || 0n;
  }

  getMinGasPrice() {
    return this.prices.reduce((min, { gasPrice }) => (gasPrice < min ? gasPrice : min), this.prices[0]?.gasPrice || 0n);
  }

  getMinAssetPrice(assetId: number) {
    return this.prices.reduce(
      (min, { assetPrices }) => (assetPrices[assetId] < min ? assetPrices[assetId] : min),
      this.prices[0]?.assetPrices[assetId] || 0n,
    );
  }

  private async recordPrices() {
    const [gasPrice, ...assetPricesList] = await Promise.all([
      this.gasPriceFeed.price(),
      ...this.assetIds.map(assetId => this.assetPriceFeeds[assetId].price()),
    ]);
    const assetPrices: { [assetId: number]: bigint } = {};
    this.assetIds.forEach((assetId, i) => (assetPrices[assetId] = assetPricesList[i]));
    this.prices = [{ gasPrice, assetPrices, timestamp: Date.now() }, ...this.prices.slice(0, this.numHistoricalPrices)];
  }
}
