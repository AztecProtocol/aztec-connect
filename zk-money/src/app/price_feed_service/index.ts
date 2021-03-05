import createDebug from 'debug';
import EventEmitter from 'events';
import { AppAssetId, assets } from '../assets';
import { PriceFeed, PriceFeedEvent } from './price_feed';

const debug = createDebug('zm:price_feed_service');

export enum PriceFeedServiceEvent {
  UPDATED_PRICE = 'UPDATED_PRICE',
}

type PriceFeedSubscriber = (assetId: AppAssetId, price: bigint) => void;

export class PriceFeedService extends EventEmitter {
  private priceFeeds: PriceFeed[];
  private subscribers: PriceFeedSubscriber[][] = [];
  private priceListeners: ((price: bigint) => void)[] = [];

  private readonly pollInterval = 5 * 60 * 1000; // 5 mins

  constructor(priceFeedContractAddresses: string[], infuraId: string, network: string) {
    super();
    this.priceFeeds = priceFeedContractAddresses.map(a => new PriceFeed(a, infuraId, network, this.pollInterval));
    assets.forEach(({ id }) => {
      this.subscribers[id] = [];
      this.priceListeners[id] = (price: bigint) => {
        this.emit(PriceFeedServiceEvent.UPDATED_PRICE, id, price);
      };
    });
  }

  getPrice(assetId: AppAssetId) {
    return this.priceFeeds[assetId]?.price || 0n;
  }

  destroy() {
    this.removeAllListeners();
    this.priceFeeds.forEach(pf => pf.destroy());
  }

  async init() {
    await Promise.all(this.priceFeeds.map(pf => pf.init()));
  }

  subscribe(assetId: AppAssetId, subscriber: PriceFeedSubscriber) {
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

  unsubscribe(assetId: AppAssetId, subscriber: PriceFeedSubscriber) {
    if (!this.priceFeeds[assetId]) return;

    this.subscribers[assetId] = this.subscribers[assetId].filter(s => s !== subscriber);
    if (!this.subscribers[assetId].length) {
      this.priceFeeds[assetId].off(PriceFeedEvent.UPDATED_PRICE, this.priceListeners[assetId]);
    }
  }
}
