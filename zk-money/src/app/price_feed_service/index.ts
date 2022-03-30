import type { CutdownAsset } from 'app/types';
import { Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { PriceFeed, PriceFeedEvent } from './price_feed';
import { mapObj } from 'app/util/objects';
import { isKnownAssetAddressString } from 'alt-model/known_assets/known_asset_addresses';

const debug = createDebug('zm:price_feed_service');

type PriceFeedSubscriber = (assetId: number, price: bigint) => void;

interface PriceFeedGroup {
  priceFeed: PriceFeed;
  subscribers: PriceFeedSubscriber[];
  priceListener: (price: bigint) => void;
}

export class PriceFeedService {
  private groups: Record<string, PriceFeedGroup>;

  private readonly pollInterval = 5 * 60 * 1000; // 5 mins

  constructor(
    priceFeedContractAddresses: Record<string, string>,
    provider: Provider,
    private readonly assets: CutdownAsset[],
  ) {
    this.groups = mapObj(priceFeedContractAddresses, (feedAddressStr, assetAddressStr): PriceFeedGroup => {
      const assetId = assets.find(x => x.address.toString() === assetAddressStr)?.id;
      return {
        priceFeed: new PriceFeed(feedAddressStr, provider, this.pollInterval),
        subscribers: [],
        priceListener: price => {
          if (assetId) this.emit(assetId, price);
        },
      };
    });
  }

  private getGroup(assetId: number) {
    const asset = this.assets[assetId];
    const assetAddressStr = asset.address.toString();
    if (!isKnownAssetAddressString(assetAddressStr)) {
      throw new Error(`Attempting PriceFeedService with unknown asset address '${assetAddressStr}'`);
    }
    return this.groups[assetAddressStr];
  }

  getPrice(assetId: number) {
    return this.getGroup(assetId)?.priceFeed?.price || 0n;
  }

  destroy() {
    Object.values(this.groups).forEach(group => group.priceFeed.destroy());
  }

  async init() {
    await Promise.all(Object.values(this.groups).map(g => g.priceFeed.init()));
  }

  subscribe(assetId: number, subscriber: PriceFeedSubscriber) {
    const group = this.getGroup(assetId);
    if (!group) return;

    if (group.subscribers.some(s => s === subscriber)) {
      debug('Duplicated subscription.');
      return;
    }

    group.subscribers.push(subscriber);
    if (group.subscribers.length === 1) {
      group.priceFeed.on(PriceFeedEvent.UPDATED_PRICE, group.priceListener);
      if (Date.now() - group.priceFeed.lastSynced > this.pollInterval) {
        group.priceFeed.refresh();
      }
    }
  }

  unsubscribe(assetId: number, subscriber: PriceFeedSubscriber) {
    const group = this.getGroup(assetId);
    if (!group) return;

    group.subscribers = group.subscribers.filter(s => s !== subscriber);
    if (!group.subscribers.length) {
      group.priceFeed.off(PriceFeedEvent.UPDATED_PRICE, group.priceListener);
    }
  }

  private emit(assetId: number, price: bigint) {
    const group = this.getGroup(assetId);
    if (!group) return;
    group.subscribers.forEach(s => s(assetId, price));
  }
}
