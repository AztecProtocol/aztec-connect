import { EthersAdapter } from '@aztec/sdk';
import { InfuraProvider, Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { Contract } from 'ethers';
import EventEmitter from 'events';

const debug = createDebug('zm:price_feed');

export enum PriceFeedEvent {
  UPDATED_PRICE = 'UPDATED_PRICE',
}

const AggregatorABI = ['function latestAnswer() public view returns(int256)'];

export class PriceFeed extends EventEmitter {
  private state!: {
    price: bigint;
    lastSynced: number;
  };
  private contract: Contract;
  private priceSubscriber?: number;

  constructor(
    priceFeedContractAddress: string,
    infuraId: string,
    network: string,
    private readonly pollInterval: number,
  ) {
    super();
    const provider = new EthersAdapter(new InfuraProvider(network, infuraId));
    const web3Provider = new Web3Provider(provider);
    this.contract = new Contract(priceFeedContractAddress, AggregatorABI, web3Provider);
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
    this.state = {
      price: BigInt(await this.contract.latestAnswer()),
      lastSynced: Date.now(),
    };
    this.subscribeToPrice();
  }

  private subscribeToPrice() {
    if (this.priceSubscriber) {
      debug('Already subscribed to price changes.');
      return;
    }

    const updatePrice = async () => {
      if (!this.listenerCount(PriceFeedEvent.UPDATED_PRICE)) return;

      const prevPrice = this.price;
      this.state = {
        price: BigInt(await this.contract.latestAnswer()),
        lastSynced: Date.now(),
      };
      if (this.price !== prevPrice) {
        this.emit(PriceFeedEvent.UPDATED_PRICE, this.price);
      }
    };

    this.priceSubscriber = window.setInterval(updatePrice, this.pollInterval);
  }

  private unsubscribeToPrice() {
    clearInterval(this.priceSubscriber);
    this.priceSubscriber = undefined;
  }
}
