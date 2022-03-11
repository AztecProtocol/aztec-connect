import { Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { Contract } from 'ethers';
import EventEmitter from 'events';

const debug = createDebug('zm:price_feed');

export enum PriceFeedEvent {
  UPDATED_PRICE = 'UPDATED_PRICE',
}

const AggregatorABI = ['function latestAnswer() public view returns(int256)'];

export class PriceFeed extends EventEmitter {
  private state = {
    price: 0n,
    lastSynced: 0,
  };
  private contract: Contract;
  private priceSubscriber?: number;

  constructor(priceFeedContractAddress: string, provider: Provider, private readonly pollInterval: number) {
    super();
    this.contract = new Contract(priceFeedContractAddress, AggregatorABI, provider);
  }

  get price() {
    return this.state.price;
  }

  get lastSynced() {
    return this.state.lastSynced;
  }

  destroy() {
    this.removeAllListeners();
    clearInterval(this.priceSubscriber);
  }

  async init() {
    await this.refresh();
  }

  async refresh() {
    this.unsubscribeToPrice();
    await this.checkPrice();
    this.subscribeToPrice();
  }

  private async checkPrice() {
    const prevPrice = this.price;
    this.state = {
      price: BigInt(await this.contract.latestAnswer()),
      lastSynced: Date.now(),
    };
    if (this.price !== prevPrice) {
      this.emit(PriceFeedEvent.UPDATED_PRICE, this.price);
    }
  }

  private subscribeToPrice() {
    if (this.priceSubscriber) {
      debug('Already subscribed to price changes.');
      return;
    }

    const updatePrice = async () => {
      if (!this.listenerCount(PriceFeedEvent.UPDATED_PRICE)) return;

      await this.checkPrice();
    };

    this.priceSubscriber = window.setInterval(updatePrice, this.pollInterval);
  }

  private unsubscribeToPrice() {
    clearInterval(this.priceSubscriber);
    this.priceSubscriber = undefined;
  }
}
