import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { assets } from '../assets';
import { PriceFeed, PriceFeedEvent } from './price_feed';

const debug = createDebug('zm:price_feed_service');

type PriceFeedSubscriber = (assetId: number, price: bigint) => void;

export class PriceFeedService {
  private priceFeeds: PriceFeed[];
  private subscribers: PriceFeedSubscriber[][] = [];
  private priceListeners: ((price: bigint) => void)[] = [];

  private readonly pollInterval = 5 * 60 * 1000; // 5 mins

  constructor(priceFeedContractAddresses: string[], provider: Web3Provider) {
    this.priceFeeds = priceFeedContractAddresses.map(a => new PriceFeed(a, provider, this.pollInterval));
    assets.forEach(({ id }) => {
      this.subscribers[id] = [];
      this.priceListeners[id] = (price: bigint) => {
        this.emit(id, price);
      };
    });
  }

  getPrice(assetId: number) {
    return this.priceFeeds[assetId]?.price || 0n;
  }

  destroy() {
    this.priceFeeds.forEach(pf => pf.destroy());
  }

  async init() {
    await Promise.all(this.priceFeeds.map(pf => pf.init()));
  }

  subscribe(assetId: number, subscriber: PriceFeedSubscriber) {
    if (!this.priceFeeds[assetId]) return;

    if (this.subscribers[assetId].some(s => s === subscriber)) {
      debug('Duplicated subscription.');
      return;
    }

    this.subscribers[assetId].push(subscriber);
    if (this.subscribers[assetId].length === 1) {
      this.priceFeeds[assetId].on(PriceFeedEvent.UPDATED_PRICE, this.priceListeners[assetId]);
      if (Date.now() - this.priceFeeds[assetId].lastSynced > this.pollInterval) {
        this.priceFeeds[assetId].refresh();
      }
    }
  }

  unsubscribe(assetId: number, subscriber: PriceFeedSubscriber) {
    if (!this.priceFeeds[assetId]) return;

    this.subscribers[assetId] = this.subscribers[assetId].filter(s => s !== subscriber);
    if (!this.subscribers[assetId].length) {
      this.priceFeeds[assetId].off(PriceFeedEvent.UPDATED_PRICE, this.priceListeners[assetId]);
    }
  }

  private emit(assetId: number, price: bigint) {
    this.subscribers[assetId].forEach(s => s(assetId, price));
  }
}
